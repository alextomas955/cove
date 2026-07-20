using Cove.Plugins;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cove.Tests;

/// <summary>
/// Load-time host contract-version negotiation: an extension declaring a minimum host version
/// above this host's contract version is disabled on a released build (with an actionable
/// both-sides message) but only warned on a development build, so local work against a
/// not-yet-released host is never blocked.
/// </summary>
public class VersionNegotiationTests
{
    private const string WhisparrSyncId = "com.example.whisparr-sync";
    private const string RenamerId = "com.example.renamer";

    private static ExtensionManager CreateManager(string numeric, string? display)
        => new(new ExtensionContext
        {
            Configuration = new ConfigurationBuilder().Build(),
            DataDirectory = Path.GetTempPath(),
            CoveVersion = numeric,
            CoveVersionDisplay = display,
        });

    [Fact]
    public async Task DevBuild_ExtensionAboveFloor_IsWarnedNotDisabled()
    {
        // Real tagged dev checkout: git describe -> v0.9.0-175-g…, Numeric "0.9.0", Display "0.9.0-dev".
        var manager = CreateManager("0.9.0", "0.9.0-dev");
        manager.Register(new StubExtension(WhisparrSyncId, minCoveVersion: "1.0.0"), "local");

        await manager.EnforceDependencyCompatibilityAsync();

        // The floor (1.0.0) is above the numeric (0.9.0), but a dev build must not disable it.
        Assert.True(manager.IsEnabled(WhisparrSyncId));
    }

    [Fact]
    public async Task ReleasedBuild_ExtensionBelowFloor_IsDisabledWithBothSidesMessage()
    {
        // Released build: Display carries no "-dev" suffix.
        var manager = CreateManager("0.9.0", "0.9.0");
        manager.Register(new StubExtension(WhisparrSyncId, minCoveVersion: "1.0.0"), "local");

        // The message names both sides before enforcement runs.
        var problem = Assert.Single(manager.ValidateDependencies(), p => p.ExtensionId == WhisparrSyncId);
        Assert.Null(problem.DependencyId); // core-version problem
        Assert.Contains("1.0.0", problem.Message);   // required floor
        Assert.Contains("0.9.0", problem.Message);   // this host

        await manager.EnforceDependencyCompatibilityAsync();

        Assert.False(manager.IsEnabled(WhisparrSyncId));
    }

    [Fact]
    public async Task NoGitFallback_ZeroVersion_IsWarnedNotDisabled()
    {
        // No-git fallback: Numeric "0.0.0" (Directory.Build.targets emits "0.0.0-dev").
        var manager = CreateManager("0.0.0", "0.0.0-dev");
        manager.Register(new StubExtension(WhisparrSyncId, minCoveVersion: "1.0.0"), "local");

        await manager.EnforceDependencyCompatibilityAsync();

        Assert.True(manager.IsEnabled(WhisparrSyncId));
    }

    [Fact]
    public async Task ReleasedBuild_LiveFloorsSatisfied_AreNotDisabled()
    {
        // A released 1.0.0 host satisfies both live extension floors.
        var manager = CreateManager("1.0.0", "1.0.0");
        manager.Register(new StubExtension(WhisparrSyncId, minCoveVersion: "1.0.0"), "local");
        manager.Register(new StubExtension(RenamerId, minCoveVersion: "0.9.0"), "local");

        Assert.DoesNotContain(manager.ValidateDependencies(), p => p.DependencyId == null);

        await manager.EnforceDependencyCompatibilityAsync();

        Assert.True(manager.IsEnabled(WhisparrSyncId));
        Assert.True(manager.IsEnabled(RenamerId));
    }

    [Fact]
    public async Task UnparseableFloor_FailsClosedWithoutThrowing()
    {
        // A malformed floor is treated as unsatisfied (fail closed) and never throws.
        var manager = CreateManager("1.0.0", "1.0.0");
        manager.Register(new StubExtension(WhisparrSyncId, minCoveVersion: "not-a-version"), "local");

        var ex = await Record.ExceptionAsync(() => manager.EnforceDependencyCompatibilityAsync());
        Assert.Null(ex);

        // Released build + unsatisfiable floor -> disabled, not a crash.
        Assert.False(manager.IsEnabled(WhisparrSyncId));
    }

    private sealed class StubExtension(string id, string? minCoveVersion) : IExtension
    {
        public string Id => id;
        public string Name => id;
        public string Version => "1.0.0";
        public string? Description => null;
        public string? Author => null;
        public string? Url => null;
        public string? IconUrl => null;
        public string? MinCoveVersion => minCoveVersion;

        public void ConfigureServices(IServiceCollection services, ExtensionContext context)
        {
        }
    }
}
