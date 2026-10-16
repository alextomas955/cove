using Cove.ApiTests.Infrastructure;
using Cove.Core.Entities;
using Cove.Core.Entities.Auth;
using Cove.Data;
using Cove.Data.Migrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Cove.ApiTests.Tests.Metadata;

// The migration attributes the shared play dates in raw PostgreSQL, which the in-memory provider cannot run.
public sealed class ScopeVideoPlayHistoryToUsersPostgresTests
{
    public enum Owner
    {
        Active,
        // Failed sign-ins lock the owner until an admin unlocks them; they still own the library.
        LockedOut,
        // An install that never set up the system owner account still has users holding the Owner role.
        OwnerRoleOnly,
        None,
    }

    [Theory]
    [InlineData(Owner.Active)]
    [InlineData(Owner.LockedOut)]
    [InlineData(Owner.OwnerRoleOnly)]
    [InlineData(Owner.None)]
    public async Task GivesSharedPlayDatesToTheOwner(Owner ownerKind)
    {
        var ct = TestContext.Current.CancellationToken;
        await using var database = await PostgreSqlTestDatabase.CreateAsync(ct);
        var options = new DbContextOptionsBuilder<CoveContext>()
            .UseNpgsql(database.ConnectionString, options => options.UseVector())
            .Options;
        await using var db = new CoveContext(options);
        var migrations = db.GetService<IMigrationsAssembly>().Migrations.Keys.ToList();
        var scopingIndex = migrations.IndexOf(MigrationId<ScopeVideoPlayHistoryToUsers>());
        Assert.True(scopingIndex > 0);
        await db.GetService<IMigrator>().MigrateAsync(migrations[scopingIndex - 1], ct);
        await using var seed = new PreProductionDateCoveContext(options);

        // A member with a lower id than the owner must not receive the dates.
        var member = new User { Username = "member", PasswordHash = "test", PasswordAlgo = "test" };
        var owner = new User
        {
            Username = "owner",
            PasswordHash = "test",
            PasswordAlgo = "test",
            IsSystem = ownerKind is Owner.Active or Owner.LockedOut,
            IsLocked = ownerKind == Owner.LockedOut,
        };
        var ownerRole = new Role { Name = "Owner", IsBuiltin = true, IsSystem = true };
        var memberRole = new Role { Name = "Member", IsBuiltin = true };
        var video = new Video { Title = "Played video" };
        seed.AddRange(member, memberRole, video);
        if (ownerKind != Owner.None)
            seed.AddRange(owner, ownerRole);
        await seed.SaveChangesAsync(ct);
        seed.UserRoleAssignments.Add(new UserRoleAssignment { UserId = member.Id, RoleId = memberRole.Id });
        if (ownerKind != Owner.None)
            seed.UserRoleAssignments.Add(new UserRoleAssignment { UserId = owner.Id, RoleId = ownerRole.Id });
        await seed.SaveChangesAsync(ct);
        var playedAt = new DateTime(2025, 2, 22, 9, 6, 51, DateTimeKind.Utc);
        // The current model writes the user column, which does not exist yet.
        await seed.Database.ExecuteSqlAsync(
            $"""INSERT INTO video_play_history ("VideoId", "PlayedAt") VALUES ({video.Id}, {playedAt}), ({video.Id}, {playedAt.AddHours(8)})""", ct);

        await db.Database.MigrateAsync(ct);

        db.ChangeTracker.Clear();
        var playDates = await db.Set<VideoPlayHistory>().IgnoreQueryFilters().OrderBy(entry => entry.PlayedAt).ToListAsync(ct);
        if (ownerKind == Owner.None)
        {
            Assert.Empty(playDates);
            return;
        }

        Assert.Equal([playedAt, playedAt.AddHours(8)], playDates.Select(entry => entry.PlayedAt));
        Assert.All(playDates, entry => Assert.Equal(owner.Id, entry.UserId));
    }

    private static string MigrationId<TMigration>() where TMigration : Migration
        => typeof(TMigration).GetCustomAttributes(typeof(MigrationAttribute), false).Cast<MigrationAttribute>().Single().Id;
}
