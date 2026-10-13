using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cove.Data.Migrations
{
    // Performers, tags, and studios kept a shared favorite flag beside each user's own favorite. Nothing kept them
    // in step: a Stash import or a bulk edit set only the shared flag, which the favorite filters, search ranking, and
    // cards then showed to every user. Favorites are per-user, so move each shared favorite that no user's own favorite
    // explains to the owner the Stash import attributes its data to (the first active, unlocked system user), keep
    // every existing favorite, and drop the shared column. An owner locked out by failed sign-ins still owns them, and an
    // install that never set up a system user falls back to its first Owner-role user. Only with no owner at all is there
    // no one to attribute the shared favorites to.
    /// <inheritdoc />
    public partial class RemoveSharedCatalogFavorites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Role content rules can test the shared favorite attribute. Once it is gone such a rule would never
            // match, so a deny rule would stop hiding anything. Freeze each test of it to the ids it matches now. A new
            // entity was never a favorite, so a test that matches non-favorites keeps covering new entities: it becomes
            // "not one of the ids it does not match". The operators below mirror cove_authz_entity_matches_attribute
            // for a value that is always a boolean.
            migrationBuilder.Sql("""
                CREATE FUNCTION pg_temp.cove_json_scalar_text(p_value jsonb) RETURNS text
                LANGUAGE sql IMMUTABLE AS $$
                    SELECT CASE
                        WHEN p_value IS NULL OR p_value = 'null'::jsonb THEN NULL
                        WHEN jsonb_typeof(p_value) = 'string' THEN trim(both '"' FROM p_value::text)
                        ELSE p_value::text
                    END;
                $$;

                CREATE FUNCTION pg_temp.cove_favorite_test_matches(p_scope_value jsonb, p_favorite boolean) RETURNS boolean
                LANGUAGE plpgsql IMMUTABLE AS $$
                DECLARE
                    v_actual jsonb := to_jsonb(p_favorite);
                    v_actual_text text := p_favorite::text;
                BEGIN
                    IF p_scope_value ? 'exists' THEN
                        RETURN coalesce((p_scope_value ->> 'exists')::boolean, false);
                    END IF;
                    IF p_scope_value ? 'equals' THEN
                        RETURN v_actual = p_scope_value -> 'equals'
                            OR v_actual_text = lower(coalesce(pg_temp.cove_json_scalar_text(p_scope_value -> 'equals'), ''));
                    END IF;
                    IF p_scope_value ? 'notEquals' THEN
                        RETURN NOT (v_actual = p_scope_value -> 'notEquals'
                            OR v_actual_text = lower(coalesce(pg_temp.cove_json_scalar_text(p_scope_value -> 'notEquals'), '')));
                    END IF;
                    IF p_scope_value ? 'contains' THEN
                        RETURN position(lower(coalesce(p_scope_value ->> 'contains', '')) IN v_actual_text) > 0;
                    END IF;
                    IF p_scope_value ? 'startsWith' THEN
                        RETURN v_actual_text LIKE lower(coalesce(p_scope_value ->> 'startsWith', '')) || '%';
                    END IF;
                    IF p_scope_value ? 'endsWith' THEN
                        RETURN v_actual_text LIKE '%' || lower(coalesce(p_scope_value ->> 'endsWith', ''));
                    END IF;
                    IF p_scope_value ? 'regex' THEN
                        RETURN v_actual_text ~* coalesce(p_scope_value ->> 'regex', '');
                    END IF;
                    IF p_scope_value ? 'in' THEN
                        RETURN EXISTS (
                            SELECT 1
                            FROM jsonb_array_elements(p_scope_value -> 'in') AS candidate
                            WHERE candidate = v_actual
                               OR lower(coalesce(pg_temp.cove_json_scalar_text(candidate), '')) = v_actual_text);
                    END IF;
                    -- gt, gte, lt and lte compare numbers, and a boolean has none.
                    RETURN false;
                END;
                $$;

                CREATE FUNCTION pg_temp.cove_freeze_favorite_tests(p_kind text, p_rule jsonb) RETURNS jsonb
                LANGUAGE plpgsql AS $$
                DECLARE
                    v_scope_kind text := lower(coalesce(p_rule ->> 'scopeKind', p_rule ->> 'scope_kind', ''));
                    v_scope_key text := CASE WHEN p_rule ? 'scope_value' AND NOT p_rule ? 'scopeValue' THEN 'scope_value' ELSE 'scopeValue' END;
                    v_scope_value jsonb := coalesce(p_rule -> v_scope_key, '{}'::jsonb);
                    v_matches_new boolean;
                    v_ids jsonb;
                BEGIN
                    IF v_scope_kind = 'attribute'
                        AND lower(coalesce(v_scope_value ->> 'path', v_scope_value ->> 'field', '')) = 'favorite' THEN
                        v_matches_new := pg_temp.cove_favorite_test_matches(v_scope_value, false);
                        EXECUTE format(
                            'SELECT coalesce(jsonb_agg("Id" ORDER BY "Id"), ''[]''::jsonb) FROM %I WHERE pg_temp.cove_favorite_test_matches($1, "Favorite") <> $2',
                            CASE lower(p_kind) WHEN 'performer' THEN 'performers' WHEN 'tag' THEN 'tags' ELSE 'studios' END)
                            INTO v_ids
                            USING v_scope_value, v_matches_new;
                        -- "Matches nothing" and "matches everything" have forms of their own that list reads can use.
                        IF v_ids = '[]'::jsonb THEN
                            RETURN CASE WHEN v_matches_new
                                THEN jsonb_build_object('scopeKind', 'all', 'scopeValue', '{}'::jsonb)
                                ELSE jsonb_build_object('scopeKind', 'expression', 'scopeValue', jsonb_build_object('op', 'or', 'rules', '[]'::jsonb))
                            END;
                        END IF;
                        IF v_matches_new THEN
                            RETURN jsonb_build_object('scopeKind', 'expression', 'scopeValue', jsonb_build_object(
                                'op', 'not',
                                'rule', jsonb_build_object('scopeKind', 'attribute', 'scopeValue', jsonb_build_object('path', 'id', 'in', v_ids))));
                        END IF;
                        RETURN jsonb_build_object('scopeKind', 'attribute', 'scopeValue', jsonb_build_object('path', 'id', 'in', v_ids));
                    END IF;

                    IF v_scope_kind <> 'expression' THEN
                        RETURN p_rule;
                    END IF;
                    IF jsonb_typeof(v_scope_value -> 'rules') = 'array' THEN
                        v_scope_value := jsonb_set(v_scope_value, '{rules}', (
                            SELECT coalesce(jsonb_agg(pg_temp.cove_freeze_favorite_tests(p_kind, item.value) ORDER BY item.ordinality), '[]'::jsonb)
                            FROM jsonb_array_elements(v_scope_value -> 'rules') WITH ORDINALITY AS item(value, ordinality)));
                    END IF;
                    IF v_scope_value ? 'rule' THEN
                        v_scope_value := jsonb_set(v_scope_value, '{rule}', pg_temp.cove_freeze_favorite_tests(p_kind, v_scope_value -> 'rule'));
                    END IF;
                    RETURN CASE WHEN p_rule ? v_scope_key THEN jsonb_set(p_rule, ARRAY[v_scope_key], v_scope_value) ELSE p_rule END;
                END;
                $$;

                WITH frozen AS (
                    SELECT rule."Id",
                           pg_temp.cove_freeze_favorite_tests(
                               rule."EntityKind",
                               jsonb_build_object('scopeKind', rule."ScopeKind", 'scopeValue', coalesce(rule."ScopeValue", '{}'::jsonb))) AS value
                    FROM role_content_rules AS rule
                    WHERE lower(rule."EntityKind") IN ('performer', 'tag', 'studio')
                )
                UPDATE role_content_rules AS rule
                SET "ScopeKind" = frozen.value ->> 'scopeKind',
                    "ScopeValue" = frozen.value -> 'scopeValue',
                    "UpdatedAt" = now()
                FROM frozen
                WHERE rule."Id" = frozen."Id"
                  AND (frozen.value ->> 'scopeKind' IS DISTINCT FROM rule."ScopeKind"
                       OR frozen.value -> 'scopeValue' IS DISTINCT FROM coalesce(rule."ScopeValue", '{}'::jsonb));

                DROP FUNCTION pg_temp.cove_freeze_favorite_tests(text, jsonb);
                DROP FUNCTION pg_temp.cove_favorite_test_matches(jsonb, boolean);
                DROP FUNCTION pg_temp.cove_json_scalar_text(jsonb);
                """);

            migrationBuilder.Sql("""
                WITH import_user AS (
                    SELECT users."Id"
                    FROM users
                    WHERE users."IsSystem"
                       OR EXISTS (
                           SELECT 1
                           FROM user_role_assignments assignment
                           JOIN roles ON roles."Id" = assignment."RoleId"
                           WHERE assignment."UserId" = users."Id" AND roles."IsSystem")
                    ORDER BY users."IsSystem" DESC, (users."IsActive" AND NOT users."IsLocked") DESC, users."Id"
                    LIMIT 1
                ),
                shared_favorites AS (
                    SELECT 3 AS host_type, "Id" AS host_id FROM performers WHERE "Favorite"
                    UNION ALL SELECT 5, "Id" FROM tags WHERE "Favorite"
                    UNION ALL SELECT 6, "Id" FROM studios WHERE "Favorite"
                )
                INSERT INTO user_entity_affinities ("UserId", "HostType", "HostId", "IsFavorite", "CreatedAt", "UpdatedAt")
                SELECT import_user."Id", shared_favorites.host_type, shared_favorites.host_id, TRUE, now(), now()
                FROM shared_favorites
                CROSS JOIN import_user
                -- Favoriting one used to set the shared flag for everyone, so a flag some user's own favorite explains came
                -- from that user rather than the owner.
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM user_entity_affinities AS favorite
                    WHERE favorite."HostType" = shared_favorites.host_type
                      AND favorite."HostId" = shared_favorites.host_id
                      AND favorite."IsFavorite")
                ON CONFLICT ("UserId", "HostType", "HostId")
                DO UPDATE SET "IsFavorite" = TRUE, "UpdatedAt" = EXCLUDED."UpdatedAt"
                WHERE NOT user_entity_affinities."IsFavorite";
                """);

            migrationBuilder.DropIndex(
                name: "IX_tags_Favorite",
                table: "tags");

            migrationBuilder.DropIndex(
                name: "IX_studios_Favorite",
                table: "studios");

            migrationBuilder.DropIndex(
                name: "IX_performers_Favorite",
                table: "performers");

            migrationBuilder.DropColumn(
                name: "Favorite",
                table: "tags");

            migrationBuilder.DropColumn(
                name: "Favorite",
                table: "studios");

            migrationBuilder.DropColumn(
                name: "Favorite",
                table: "performers");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Favorite",
                table: "tags",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Favorite",
                table: "studios",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Favorite",
                table: "performers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_tags_Favorite",
                table: "tags",
                column: "Favorite");

            migrationBuilder.CreateIndex(
                name: "IX_studios_Favorite",
                table: "studios",
                column: "Favorite");

            migrationBuilder.CreateIndex(
                name: "IX_performers_Favorite",
                table: "performers",
                column: "Favorite");

            // Restore the shared flag from the owner's favorites, the closest thing to what it held.
            migrationBuilder.Sql("""
                WITH import_user AS (
                    SELECT users."Id"
                    FROM users
                    WHERE users."IsSystem"
                       OR EXISTS (
                           SELECT 1
                           FROM user_role_assignments assignment
                           JOIN roles ON roles."Id" = assignment."RoleId"
                           WHERE assignment."UserId" = users."Id" AND roles."IsSystem")
                    ORDER BY users."IsSystem" DESC, (users."IsActive" AND NOT users."IsLocked") DESC, users."Id"
                    LIMIT 1
                )
                UPDATE performers SET "Favorite" = TRUE
                WHERE "Id" IN (SELECT "HostId" FROM user_entity_affinities, import_user
                    WHERE "UserId" = import_user."Id" AND "HostType" = 3 AND "IsFavorite");
                WITH import_user AS (
                    SELECT users."Id"
                    FROM users
                    WHERE users."IsSystem"
                       OR EXISTS (
                           SELECT 1
                           FROM user_role_assignments assignment
                           JOIN roles ON roles."Id" = assignment."RoleId"
                           WHERE assignment."UserId" = users."Id" AND roles."IsSystem")
                    ORDER BY users."IsSystem" DESC, (users."IsActive" AND NOT users."IsLocked") DESC, users."Id"
                    LIMIT 1
                )
                UPDATE tags SET "Favorite" = TRUE
                WHERE "Id" IN (SELECT "HostId" FROM user_entity_affinities, import_user
                    WHERE "UserId" = import_user."Id" AND "HostType" = 5 AND "IsFavorite");
                WITH import_user AS (
                    SELECT users."Id"
                    FROM users
                    WHERE users."IsSystem"
                       OR EXISTS (
                           SELECT 1
                           FROM user_role_assignments assignment
                           JOIN roles ON roles."Id" = assignment."RoleId"
                           WHERE assignment."UserId" = users."Id" AND roles."IsSystem")
                    ORDER BY users."IsSystem" DESC, (users."IsActive" AND NOT users."IsLocked") DESC, users."Id"
                    LIMIT 1
                )
                UPDATE studios SET "Favorite" = TRUE
                WHERE "Id" IN (SELECT "HostId" FROM user_entity_affinities, import_user
                    WHERE "UserId" = import_user."Id" AND "HostType" = 6 AND "IsFavorite");
                """);
        }
    }
}
