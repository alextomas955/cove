using System.Text.Json;
using Cove.ApiTests.Infrastructure;
using Cove.Core.Entities;
using Cove.Core.Entities.Auth;
using Cove.Data;
using Cove.Data.Migrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Cove.ApiTests.Tests.Metadata;

// The migration moves shared favorites and rewrites content rules in raw PostgreSQL, which the in-memory provider
// cannot run.
public sealed class RemoveSharedCatalogFavoritesPostgresTests
{
    [Fact]
    public async Task MovesSharedFavoritesToTheOwnerAndFreezesContentRulesThatTestThem()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var database = await PostgreSqlTestDatabase.CreateAsync(ct);
        await using var db = new CoveContext(new DbContextOptionsBuilder<CoveContext>()
            .UseNpgsql(database.ConnectionString, options => options.UseVector())
            .Options);
        var migrations = db.GetService<IMigrationsAssembly>().Migrations.Keys.ToList();
        var removalIndex = migrations.IndexOf(MigrationId<RemoveSharedCatalogFavorites>());
        Assert.True(removalIndex > 0);
        await db.GetService<IMigrator>().MigrateAsync(migrations[removalIndex - 1], ct);
        // The current model no longer writes the shared column, so give it a default for the rows inserted here.
        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE performers ALTER COLUMN "Favorite" SET DEFAULT FALSE;
            ALTER TABLE tags ALTER COLUMN "Favorite" SET DEFAULT FALSE;
            ALTER TABLE studios ALTER COLUMN "Favorite" SET DEFAULT FALSE;
            """, ct);

        var owner = new User { Username = "owner", PasswordHash = "test", PasswordAlgo = "test", IsSystem = true };
        var member = new User { Username = "member", PasswordHash = "test", PasswordAlgo = "test" };
        var sharedFavorite = new Performer { Name = "Shared favorite" };
        var alreadyOwnersFavorite = new Performer { Name = "Already the owner's favorite" };
        var notFavorite = new Performer { Name = "Not a favorite" };
        var membersFavorite = new Performer { Name = "The member's favorite" };
        var favoriteTag = new Tag { Name = "Favorite tag" };
        var favoriteStudio = new Studio { Name = "Favorite studio" };
        var otherStudio = new Studio { Name = "Other studio" };
        var role = new Role { Name = "Restricted" };
        db.AddRange(owner, member, sharedFavorite, alreadyOwnersFavorite, notFavorite, membersFavorite, favoriteTag, favoriteStudio, otherStudio, role);
        await db.SaveChangesAsync(ct);
        await db.Database.ExecuteSqlRawAsync(
            """UPDATE performers SET "Favorite" = TRUE WHERE "Id" IN ({0}, {1}, {2})""", [sharedFavorite.Id, alreadyOwnersFavorite.Id, membersFavorite.Id], ct);
        await db.Database.ExecuteSqlRawAsync("""UPDATE tags SET "Favorite" = TRUE WHERE "Id" = {0}""", [favoriteTag.Id], ct);
        await db.Database.ExecuteSqlRawAsync("""UPDATE studios SET "Favorite" = TRUE WHERE "Id" = {0}""", [favoriteStudio.Id], ct);
        db.UserEntityAffinities.AddRange(
            // The owner already viewed the shared favorite without favoriting it, so the migration updates that row.
            new UserEntityAffinity { UserId = owner.Id, HostType = AffinityHostType.Performer, HostId = sharedFavorite.Id, ViewCount = 3 },
            new UserEntityAffinity { UserId = owner.Id, HostType = AffinityHostType.Performer, HostId = alreadyOwnersFavorite.Id, IsFavorite = true, FavoritedAt = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc) },
            new UserEntityAffinity { UserId = member.Id, HostType = AffinityHostType.Performer, HostId = notFavorite.Id, IsFavorite = true },
            // The member's own favorite set the shared flag, so it stays the member's alone.
            new UserEntityAffinity { UserId = member.Id, HostType = AffinityHostType.Performer, HostId = membersFavorite.Id, IsFavorite = true });
        var hideFavoritePerformers = Rule(role, "performer", "attribute", """{"path":"favorite","equals":true}""");
        var hideOtherStudios = Rule(role, "studio", "attribute", """{"path":"favorite","equals":false}""");
        var hideNamedFavoriteTags = Rule(role, "tag", "expression",
            """{"op":"and","rules":[{"scopeKind":"attribute","scopeValue":{"path":"favorite","equals":true}},{"scopeKind":"attribute","scopeValue":{"path":"name","contains":"tag"}}]}""");
        var hideByName = Rule(role, "performer", "attribute", """{"path":"name","contains":"Not"}""");
        var hideNonFavoritePerformers = Rule(role, "performer", "attribute", """{"field":"Favorite","notEquals":"true"}""");
        var hideAnyTag = Rule(role, "tag", "attribute", """{"path":"favorite","exists":true}""");
        var hideNoPerformer = Rule(role, "performer", "attribute", """{"path":"favorite","equals":"maybe"}""");
        var showOnlyFavoriteStudios = Rule(role, "studio", "expression", """{"op":"not","rule":{"scope_kind":"attribute","scope_value":{"path":"favorite","in":[true]}}}""");
        var videoRule = Rule(role, "video", "attribute", """{"path":"favorite","equals":true}""");
        db.RoleContentRules.AddRange(hideFavoritePerformers, hideOtherStudios, hideNamedFavoriteTags, hideByName, hideNonFavoritePerformers, hideAnyTag, hideNoPerformer, showOnlyFavoriteStudios, videoRule);
        await db.SaveChangesAsync(ct);

        await db.Database.MigrateAsync(ct);

        db.ChangeTracker.Clear();
        var favorites = await db.UserEntityAffinities
            .Where(affinity => affinity.IsFavorite)
            .Select(affinity => new { affinity.UserId, affinity.HostType, affinity.HostId, affinity.ViewCount, affinity.FavoritedAt })
            .ToListAsync(ct);
        Assert.Equal(
            new[]
            {
                (owner.Id, AffinityHostType.Performer, sharedFavorite.Id),
                (owner.Id, AffinityHostType.Performer, alreadyOwnersFavorite.Id),
                (owner.Id, AffinityHostType.Tag, favoriteTag.Id),
                (owner.Id, AffinityHostType.Studio, favoriteStudio.Id),
                (member.Id, AffinityHostType.Performer, notFavorite.Id),
                (member.Id, AffinityHostType.Performer, membersFavorite.Id),
            }.Order(),
            favorites.Select(favorite => (favorite.UserId, favorite.HostType, favorite.HostId)).Order());
        Assert.Equal(3, favorites.Single(favorite => favorite.UserId == owner.Id && favorite.HostId == sharedFavorite.Id && favorite.HostType == AffinityHostType.Performer).ViewCount);
        Assert.Equal(new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc), favorites.Single(favorite => favorite.HostId == alreadyOwnersFavorite.Id && favorite.HostType == AffinityHostType.Performer).FavoritedAt);
        Assert.Empty(await db.Database
            .SqlQueryRaw<string>("""SELECT table_name AS "Value" FROM information_schema.columns WHERE table_name IN ('performers', 'tags', 'studios') AND column_name = 'Favorite'""")
            .ToListAsync(ct));

        var rules = await db.RoleContentRules.ToDictionaryAsync(rule => rule.Id, ct);
        AssertRule(rules[hideFavoritePerformers.Id], "attribute", $$"""{"path":"id","in":[{{sharedFavorite.Id}},{{alreadyOwnersFavorite.Id}},{{membersFavorite.Id}}]}""");
        // Hiding non-favorite studios keeps hiding studios created later, which were never favorites.
        AssertRule(rules[hideOtherStudios.Id], "expression",
            """{"op":"not","rule":{"scopeKind":"attribute","scopeValue":{"path":"id","in":[""" + favoriteStudio.Id + """]}}}""");
        AssertRule(rules[hideNamedFavoriteTags.Id], "expression",
            """{"op":"and","rules":[{"scopeKind":"attribute","scopeValue":{"path":"id","in":[""" + favoriteTag.Id
            + """]}},{"scopeKind":"attribute","scopeValue":{"path":"name","contains":"tag"}}]}""");
        AssertRule(rules[hideByName.Id], "attribute", """{"path":"name","contains":"Not"}""");
        AssertRule(rules[hideNonFavoritePerformers.Id], "expression",
            """{"op":"not","rule":{"scopeKind":"attribute","scopeValue":{"path":"id","in":[""" + string.Join(",", sharedFavorite.Id, alreadyOwnersFavorite.Id, membersFavorite.Id) + """]}}}""");
        AssertRule(rules[hideAnyTag.Id], "all", "{}");
        AssertRule(rules[hideNoPerformer.Id], "expression", """{"op":"or","rules":[]}""");
        AssertRule(rules[showOnlyFavoriteStudios.Id], "expression",
            """{"op":"not","rule":{"scopeKind":"attribute","scopeValue":{"path":"id","in":[""" + favoriteStudio.Id + """]}}}""");
        AssertRule(rules[videoRule.Id], "attribute", """{"path":"favorite","equals":true}""");
    }

    // Failed sign-ins lock the owner until an admin unlocks them, and an install that never set up the system owner account
    // still has users holding the Owner role; either way the owner still owns the library.
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task MovesSharedFavoritesToAnOwnerWhoCannotSignIn(bool lockedSystemOwner)
    {
        var ct = TestContext.Current.CancellationToken;
        await using var database = await PostgreSqlTestDatabase.CreateAsync(ct);
        await using var db = new CoveContext(new DbContextOptionsBuilder<CoveContext>()
            .UseNpgsql(database.ConnectionString, options => options.UseVector())
            .Options);
        var migrations = db.GetService<IMigrationsAssembly>().Migrations.Keys.ToList();
        var removalIndex = migrations.IndexOf(MigrationId<RemoveSharedCatalogFavorites>());
        Assert.True(removalIndex > 0);
        await db.GetService<IMigrator>().MigrateAsync(migrations[removalIndex - 1], ct);
        await db.Database.ExecuteSqlRawAsync("""ALTER TABLE performers ALTER COLUMN "Favorite" SET DEFAULT FALSE""", ct);

        // A member with a lower id than the owner must not receive the favorites.
        var member = new User { Username = "member", PasswordHash = "test", PasswordAlgo = "test" };
        var owner = new User
        {
            Username = "owner",
            PasswordHash = "test",
            PasswordAlgo = "test",
            IsSystem = lockedSystemOwner,
            IsLocked = lockedSystemOwner,
        };
        var ownerRole = new Role { Name = "Owner", IsBuiltin = true, IsSystem = true };
        var sharedFavorite = new Performer { Name = "Shared favorite" };
        db.AddRange(member, owner, ownerRole, sharedFavorite);
        await db.SaveChangesAsync(ct);
        db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = owner.Id, RoleId = ownerRole.Id });
        await db.SaveChangesAsync(ct);
        await db.Database.ExecuteSqlRawAsync("""UPDATE performers SET "Favorite" = TRUE WHERE "Id" = {0}""", [sharedFavorite.Id], ct);

        await db.GetService<IMigrator>().MigrateAsync(migrations[removalIndex], ct);

        db.ChangeTracker.Clear();
        var favorite = Assert.Single(await db.UserEntityAffinities.Where(affinity => affinity.IsFavorite).ToListAsync(ct));
        Assert.Equal((owner.Id, AffinityHostType.Performer, sharedFavorite.Id), (favorite.UserId, favorite.HostType, favorite.HostId));

        // Rolling back restores the shared flag from the same owner's favorites.
        await db.GetService<IMigrator>().MigrateAsync(migrations[removalIndex - 1], ct);
        Assert.Equal(
            [sharedFavorite.Id],
            await db.Database.SqlQueryRaw<int>("""SELECT "Id" AS "Value" FROM performers WHERE "Favorite" """).ToListAsync(ct));
    }

    private static RoleContentRule Rule(Role role, string entityKind, string scopeKind, string scopeValue)
        => new() { RoleId = role.Id, Role = role, EntityKind = entityKind, Effect = "deny", ScopeKind = scopeKind, ScopeValue = scopeValue, AppliesTo = "read" };

    private static void AssertRule(RoleContentRule rule, string scopeKind, string scopeValue)
    {
        Assert.Equal(scopeKind, rule.ScopeKind);
        Assert.True(
            JsonElement.DeepEquals(JsonDocument.Parse(scopeValue).RootElement, JsonDocument.Parse(rule.ScopeValue).RootElement),
            $"Expected {scopeValue} but found {rule.ScopeValue}.");
    }

    private static string MigrationId<TMigration>() where TMigration : Migration
        => typeof(TMigration).GetCustomAttributes(typeof(MigrationAttribute), false).Cast<MigrationAttribute>().Single().Id;
}
