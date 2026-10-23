using Cove.Api.Updates;

namespace Cove.Tests;

public class UpdatePolicyTests
{
    private static UpdateRelease Release(string version, List<string>? migrations = null, string channel = UpdateChannels.Stable) => new()
    {
        Version = version,
        Channel = channel,
        Migrations = migrations,
    };

    [Theory]
    [InlineData("auto", "1.4.1", "stable")]
    [InlineData("auto", "1.4.2-dev.7", "nightly")]
    [InlineData("auto", "1.5.0-rc.1", "prerelease")]
    [InlineData("auto", "1.5.0-beta.2", "prerelease")]
    [InlineData(null, "1.4.1", "stable")]
    [InlineData("nonsense", "1.4.2-dev.1", "nightly")]
    [InlineData("stable", "1.4.2-dev.7", "stable")]
    [InlineData("NIGHTLY", "1.4.1", "nightly")]
    [InlineData("prerelease", "1.4.1", "prerelease")]
    public void ResolveChannel_follows_the_running_build_for_auto(string? configured, string current, string expected)
        => Assert.Equal(expected, UpdatePolicy.ResolveChannel(configured, current));

    [Theory]
    // SemVer precedence: dev.N < rc.N < release, and numeric identifiers compare numerically.
    [InlineData("1.4.2", "1.4.2-dev.9", true)]
    [InlineData("1.4.2-rc.1", "1.4.2-dev.9", true)]
    [InlineData("1.4.2-dev.10", "1.4.2-dev.9", true)]
    [InlineData("1.4.2-dev.9", "1.4.2-rc.1", false)]
    [InlineData("1.4.2-rc.1", "1.4.2", false)]
    [InlineData("1.4.1", "1.4.1", false)]
    [InlineData("1.4.0", "1.4.1", false)]
    [InlineData("not-a-version", "1.4.1", false)]
    public void IsNewer_uses_semver_precedence(string candidate, string current, bool expected)
        => Assert.Equal(expected, UpdatePolicy.IsNewer(candidate, current));

    [Fact]
    public void Stable_channel_offers_only_a_newer_stable()
    {
        Assert.Equal("1.5.0", UpdatePolicy.SelectOffer("stable", "1.4.1", Release("1.5.0"), Release("1.5.1-dev.3"), [])?.Version);
        Assert.Null(UpdatePolicy.SelectOffer("stable", "1.5.0", Release("1.5.0"), null, []));
    }

    [Fact]
    public void Stable_channel_never_offers_a_downgrade()
    {
        // A dev build on the stable channel is ahead of the latest stable, so nothing is offered.
        Assert.Null(UpdatePolicy.SelectOffer("stable", "1.4.2-dev.7", Release("1.4.1"), null, []));
        Assert.Null(UpdatePolicy.SelectOffer("stable", "2.0.0", Release("1.9.9"), null, []));
    }

    [Fact]
    public void Stable_channel_rejects_a_prerelease_published_as_stable()
        => Assert.Null(UpdatePolicy.SelectOffer("stable", "1.4.1", Release("1.5.0-rc.1"), null, []));

    [Fact]
    public void Nightly_channel_offers_the_newer_of_nightly_and_stable()
    {
        Assert.Equal("1.4.2-dev.9", UpdatePolicy.SelectOffer("nightly", "1.4.2-dev.7", Release("1.4.1"), Release("1.4.2-dev.9"), [])?.Version);
        // The stable that the dev line led to is newer than every dev build of that line.
        Assert.Equal("1.4.2", UpdatePolicy.SelectOffer("nightly", "1.4.2-dev.7", Release("1.4.2"), Release("1.4.2-dev.9"), [])?.Version);
        Assert.Null(UpdatePolicy.SelectOffer("nightly", "1.4.2-dev.9", Release("1.4.1"), Release("1.4.2-dev.9"), []));
    }

    [Fact]
    public void Nightly_channel_rejects_a_nightly_manifest_at_or_below_the_running_version()
        => Assert.Null(UpdatePolicy.SelectOffer("nightly", "1.4.2-dev.9", null, Release("1.4.2-dev.8"), []));

    [Fact]
    public void Prerelease_channel_offers_the_newest_stable_or_prerelease_but_not_dev_builds()
    {
        var offer = UpdatePolicy.SelectOffer(
            "prerelease",
            "1.5.0-rc.1",
            Release("1.4.1"),
            null,
            [Release("1.5.0-rc.2"), Release("1.5.0-rc.3"), Release("1.5.1-dev.4")]);
        Assert.Equal("1.5.0-rc.3", offer?.Version);

        Assert.Equal("1.5.0", UpdatePolicy.SelectOffer("prerelease", "1.5.0-rc.3", Release("1.5.0"), null, [Release("1.5.0-rc.3")])?.Version);
    }

    [Theory]
    [InlineData("off", "1.4.1", "1.4.2", true, false)]
    [InlineData("all", "1.4.1", "2.0.0", false, true)]
    [InlineData("safe", "1.4.1", "1.5.0", true, true)]
    [InlineData("safe", "1.4.1", "1.5.0", false, false)]
    [InlineData("safe", "1.4.1", "2.0.0", true, false)]
    [InlineData("safe", "0.9.0", "1.0.0", true, false)]
    public void Safe_auto_update_requires_same_major_and_no_new_migrations(
        string mode,
        string current,
        string offered,
        bool migrationsKnown,
        bool expected)
    {
        string[] known = ["20260101000000_A", "20260102000000_B"];
        var offer = Release(offered, migrationsKnown ? ["20260101000000_A"] : ["20260101000000_A", "20260301000000_New"]);

        Assert.Equal(expected, UpdatePolicy.EvaluateAutoUpdate(mode, current, offer, known).Allowed);
    }

    [Fact]
    public void Safe_auto_update_refuses_a_release_that_does_not_list_migrations()
    {
        var decision = UpdatePolicy.EvaluateAutoUpdate("safe", "1.4.1", Release("1.4.2"), ["20260101000000_A"]);

        Assert.False(decision.Allowed);
        Assert.Contains("migrations", decision.Reason);
    }

    [Fact]
    public void RequiresMigration_is_unknown_without_a_migration_list()
    {
        Assert.Null(UpdatePolicy.RequiresMigration(Release("1.4.2"), ["A"]));
        Assert.False(UpdatePolicy.RequiresMigration(Release("1.4.2", ["A"]), ["A", "B"]));
        Assert.True(UpdatePolicy.RequiresMigration(Release("1.4.2", ["A", "C"]), ["A", "B"]));
    }

    [Theory]
    [InlineData("03:00-05:00", "03:00", true)]
    [InlineData("03:00-05:00", "04:59", true)]
    [InlineData("03:00-05:00", "05:00", false)]
    [InlineData("03:00-05:00", "02:59", false)]
    [InlineData("23:00-01:30", "23:30", true)]
    [InlineData("23:00-01:30", "01:00", true)]
    [InlineData("23:00-01:30", "12:00", false)]
    [InlineData("garbage", "03:30", false)]
    [InlineData("03:00-03:00", "03:00", false)]
    public void Auto_update_window_supports_wrapping_past_midnight(string window, string now, bool expected)
        => Assert.Equal(expected, UpdatePolicy.IsInWindow(window, TimeOnly.Parse(now, System.Globalization.CultureInfo.InvariantCulture)));
}
