-- Supabase Backend Migration: Missing Features Fixes
-- Applied: 2026-05-08

-- 1. DECK VALIDATION
CREATE OR REPLACE FUNCTION public.validate_deck(p_deck_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_leader_count int;
    v_card_count int;
    v_location_count int;
    v_illegal_copies text[];
    v_is_legal boolean := true;
    v_reasons text[] := ARRAY[]::text[];
BEGIN
    -- Exactly 1 Leader
    SELECT count(*) INTO v_leader_count 
    FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = p_deck_id AND c.card_type = 'Leader';
    
    IF v_leader_count != 1 THEN
        v_is_legal := false;
        v_reasons := v_reasons || format('Deck must have exactly 1 Leader (currently %s)', v_leader_count);
    END IF;

    -- Exactly 19 non-Leader cards (1 Leader + 19 Cards = 20 Total)
    SELECT count(*) INTO v_card_count
    FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = p_deck_id AND c.card_type != 'Leader';
    
    IF v_card_count != 19 THEN
        v_is_legal := false;
        v_reasons := v_reasons || format('Main deck must be exactly 19 cards (currently %s)', v_card_count);
    END IF;

    -- Exactly 1 Location
    SELECT count(*) INTO v_location_count
    FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = p_deck_id AND c.card_type = 'Location';
    
    IF v_location_count != 1 THEN
        v_is_legal := false;
        v_reasons := v_reasons || format('Deck must have exactly 1 Location (currently %s)', v_location_count);
    END IF;

    -- Max 2 copies (1 for Divine)
    SELECT array_agg(c.name) INTO v_illegal_copies
    FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = p_deck_id AND c.card_type != 'Leader'
    GROUP BY c.id, c.name, c.rarity
    HAVING (c.rarity = 'Divine' AND count(*) > 1) OR (c.rarity != 'Divine' AND count(*) > 2);

    IF v_illegal_copies IS NOT NULL THEN
        v_is_legal := false;
        v_reasons := v_reasons || format('Too many copies of: %s', array_to_string(v_illegal_copies, ', '));
    END IF;

    UPDATE public.decks 
    SET is_legal = v_is_legal, legality_reasons = v_reasons, updated_at = NOW() 
    WHERE id = p_deck_id;

    RETURN jsonb_build_object('is_legal', v_is_legal, 'reasons', v_reasons);
END;
$$;

-- 1.1 DECK RPCs
CREATE OR REPLACE FUNCTION public.get_deck(p_deck_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_deck record;
    v_leader jsonb;
    v_cards jsonb;
BEGIN
    SELECT * INTO v_deck FROM public.decks WHERE id = p_deck_id;
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- Leader
    SELECT jsonb_build_object(
        'id', c.id, 'name', c.name, 'card_type', c.card_type, 'rarity', c.rarity,
        'cast_cost', c.cast_cost, 'defense', c.defense, 'keyword', c.keyword,
        'keyword_tier', c.keyword_tier, 'effect_text', c.effect_text, 'image_url', c.image_url,
        'quantity', COALESCE(uc.quantity, 0), 'foil_quantity', COALESCE(uc.foil_quantity, 0)
    ) INTO v_leader
    FROM deck_cards dc
    JOIN cards c ON dc.card_id = c.id
    LEFT JOIN user_collection uc ON uc.card_id = c.id AND uc.user_id = auth.uid()
    WHERE dc.deck_id = p_deck_id AND c.card_type = 'Leader'
    LIMIT 1;

    -- Main Deck Cards
    WITH deck_list AS (
      SELECT c.*, dc.id as dc_id
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = p_deck_id AND c.card_type != 'Leader'
      ORDER BY dc.id ASC 
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', dl.id, 'name', dl.name, 'card_type', dl.card_type, 'rarity', dl.rarity,
            'cast_cost', dl.cast_cost, 'defense', dl.defense, 'keyword', dl.keyword,
            'keyword_tier', dl.keyword_tier, 'effect_text', dl.effect_text, 'image_url', dl.image_url,
            'quantity', COALESCE(uc.quantity, 0), 'foil_quantity', COALESCE(uc.foil_quantity, 0)
        )
    ) INTO v_cards
    FROM deck_list dl
    LEFT JOIN user_collection uc ON uc.card_id = dl.id AND uc.user_id = auth.uid();

    RETURN jsonb_build_object(
        'id', v_deck.id,
        'name', v_deck.name,
        'format', v_deck.format,
        'is_legal', v_deck.is_legal,
        'legality_reasons', v_deck.legality_reasons,
        'leader', v_leader,
        'cards', COALESCE(v_cards, '[]'::jsonb)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_decks()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(d)
        FROM (
            SELECT 
                d.id, d.name, d.is_legal, d.legality_reasons, d.updated_at,
                (SELECT count(*) FROM deck_cards dc1 JOIN cards c1 ON dc1.card_id = c1.id WHERE dc1.deck_id = d.id AND c1.card_type != 'Leader') as card_count,
                l.id as leader_id,
                l.name as leader_name,
                l.image_url as leader_image
            FROM public.decks d
            LEFT JOIN LATERAL (
                SELECT c.id, c.name, c.image_url
                FROM deck_cards dc
                JOIN cards c ON dc.card_id = c.id
                WHERE dc.deck_id = d.id AND c.card_type = 'Leader'
                LIMIT 1
            ) l ON true
            WHERE d.user_id = auth.uid()
            ORDER BY d.updated_at DESC
        ) d
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_deck(
  p_deck_id uuid,
  p_name text,
  p_leader_id uuid,
  p_card_ids uuid[],
  p_format text DEFAULT 'standard'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_id uuid := p_deck_id;
    v_card_id uuid;
BEGIN
    IF v_id IS NULL THEN
        INSERT INTO public.decks (name, user_id, format)
        VALUES (p_name, auth.uid(), p_format)
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.decks SET name = p_name, updated_at = NOW() WHERE id = v_id AND user_id = auth.uid();
    END IF;

    DELETE FROM public.deck_cards WHERE deck_id = v_id;
    
    IF p_leader_id IS NOT NULL THEN
      INSERT INTO public.deck_cards (deck_id, card_id) VALUES (v_id, p_leader_id);
    END IF;
    
    FOREACH v_card_id IN ARRAY p_card_ids LOOP
        INSERT INTO public.deck_cards (deck_id, card_id) VALUES (v_id, v_card_id);
    END LOOP;

    PERFORM public.validate_deck(v_id);

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_deck(p_deck_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM public.decks WHERE id = p_deck_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_buildable_cards()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(c)
        FROM (
            SELECT 
                c.*, 
                COALESCE(uc.quantity, 0) as quantity,
                COALESCE(uc.foil_quantity, 0) as foil_quantity
            FROM public.cards c
            LEFT JOIN public.user_collection uc ON uc.card_id = c.id AND uc.user_id = auth.uid()
            ORDER BY c.cast_cost ASC, c.name ASC
        ) c
    );
END;
$$;

-- 2. QUEST PROGRESS TRACKING
CREATE OR REPLACE FUNCTION public.increment_quest_progress(p_user_id uuid, p_quest_type text, p_amount int DEFAULT 1)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE public.user_quests
    SET progress = progress + p_amount, updated_at = NOW()
    WHERE user_id = p_user_id 
      AND status = 'active'
      AND quest_id IN (SELECT id FROM quests WHERE quest_type = p_quest_type);
END;
$$;

-- 3. PLAYER RATINGS INITIALIZATION
-- One-time seed for existing users
INSERT INTO public.player_ratings (user_id) 
SELECT id FROM public.profiles 
ON CONFLICT DO NOTHING;

-- Trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_profile_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.player_ratings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_rating ON public.profiles;
CREATE TRIGGER on_profile_created_rating
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_rating();

-- 4. SEASON PASS XP
CREATE OR REPLACE FUNCTION public.add_season_pass_xp(p_amount int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE public.user_season_pass
    SET xp_earned = xp_earned + p_amount, updated_at = NOW()
    WHERE user_id = auth.uid() AND season = 1; -- Current season context
END;
$$;

-- 5. MARKETPLACE CLEANUP
CREATE OR REPLACE FUNCTION public.expire_listings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.market_listings
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;

-- 6. ENERGY REGEN
CREATE OR REPLACE FUNCTION public.regen_energy()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.profiles
  SET
    energy = LEAST(max_energy, energy + FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(energy_last_regen, NOW()))) / 300)::int),
    energy_last_regen = NOW()
  WHERE energy < max_energy AND id = auth.uid();
END;
$$;

-- 7. MATCHMAKING PAIRING
CREATE OR REPLACE FUNCTION public.pair_matchmaking_queue()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_player1 record;
    v_player2 record;
BEGIN
    FOR v_player1 IN (SELECT * FROM matchmaking_queue ORDER BY created_at ASC) LOOP
        -- Simple pairing: same mode, different player
        SELECT * INTO v_player2 
        FROM matchmaking_queue 
        WHERE mode = v_player1.mode AND user_id != v_player1.user_id 
        LIMIT 1;

        IF v_player2 IS NOT NULL THEN
            -- Create match
            INSERT INTO public.matches (player1_id, player2_id, mode, status)
            VALUES (v_player1.user_id, v_player2.user_id, v_player1.mode, 'starting');
            
            -- Remove from queue
            DELETE FROM matchmaking_queue WHERE user_id IN (v_player1.user_id, v_player2.user_id);
        END IF;
    END LOOP;
END;
$$;

-- One-time sync for user collection (BUG 8)
INSERT INTO public.user_collection (user_id, card_id, quantity)
SELECT user_id, card_id, COALESCE(quantity, 1)
FROM public.user_cards
ON CONFLICT (user_id, card_id) DO UPDATE
  SET quantity = EXCLUDED.quantity;
