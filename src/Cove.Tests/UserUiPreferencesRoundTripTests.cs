using System.Text.Json;
using Cove.Core.Auth;
using Cove.Core.Common;

namespace Cove.Tests;

public class UserUiPreferencesRoundTripTests
{
    private static UserUiPreferencesDto BuildPreferences() => new(
        Theme: new UserThemePreferencesDto(
            ActiveThemeId: "midnight",
            ActiveComponentStyles: ["rounded", "compact"],
            ActiveLayoutStyle: "grid",
            CustomThemeColors: new Dictionary<string, string> { ["accent"] = "#ff8800" },
            StyleOptions: new Dictionary<string, Dictionary<string, string>>
            {
                ["card"] = new() { ["radius"] = "8px" },
            }),
        RatingSystemOptions: new UserRatingSystemOptionsDto(Type: "stars", StarPrecision: "half"),
        Tracking: new UserTrackingPreferencesDto(
            Enabled: true,
            MinViewSeconds: 5,
            ViewCompletionRatio: 0.75,
            MinImageDetailViewSeconds: 3,
            MinDerivedLikeSessionSeconds: 30,
            SessionIdleTimeoutSec: 120,
            DwellPositiveSec: 10),
        Videos: new UserVideosPreferencesDto(IncludeCompilationGroups: false),
        KeybindingOverrides: new Dictionary<string, string> { ["playPause"] = "space" },
        Playback: new UserPlaybackPreferencesDto(SkipSeconds: 15),
        HomePageContent: "{\"rows\":[]}",
        DefaultFilters: new Dictionary<string, string> { ["videos"] = "{\"sort\":\"name\"}" });

    [Fact]
    public void RoundTrip_PopulatedPreferences_PreservesValue()
    {
        var original = BuildPreferences();

        var json = JsonSerializer.Serialize(original, CoveJson.Default);
        var roundTrip = JsonSerializer.Deserialize<UserUiPreferencesDto>(json, CoveJson.Default);

        Assert.NotNull(roundTrip);
        // Nested records without dictionaries compare structurally.
        Assert.Equal(original.RatingSystemOptions, roundTrip!.RatingSystemOptions);
        Assert.Equal(original.Tracking, roundTrip.Tracking);
        Assert.Equal(original.Videos, roundTrip.Videos);
        Assert.Equal(original.Playback, roundTrip.Playback);
        Assert.Equal(original.HomePageContent, roundTrip.HomePageContent);
        Assert.Equal(original.KeybindingOverrides, roundTrip.KeybindingOverrides);
        Assert.Equal(original.DefaultFilters, roundTrip.DefaultFilters);
        // Full-graph fidelity: re-serializing the round-tripped value reproduces the original JSON.
        Assert.Equal(json, JsonSerializer.Serialize(roundTrip, CoveJson.Default));
    }

    [Fact]
    public void Serialize_MatchesPreConsolidationShape_NoDrift()
    {
        var preferences = BuildPreferences();

        // The exact options UserService used before consolidating onto CoveJson.Default.
        var legacyOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        var canonical = JsonSerializer.Serialize(preferences, CoveJson.Default);
        var legacy = JsonSerializer.Serialize(preferences, legacyOptions);

        // Switching UiPreferencesJsonOptions -> CoveJson.Default must not drift the persisted blob.
        Assert.Equal(legacy, canonical);
    }

    [Fact]
    public void Serialize_MinimalPreferences_MatchesPinnedCamelCaseFixture()
    {
        var preferences = new UserUiPreferencesDto(
            Theme: null,
            RatingSystemOptions: null,
            Tracking: null,
            Videos: null,
            KeybindingOverrides: new Dictionary<string, string> { ["playPause"] = "space" },
            Playback: null,
            HomePageContent: "home-json",
            DefaultFilters: null);

        var json = JsonSerializer.Serialize(preferences, CoveJson.Default);

        const string expected =
            "{\"theme\":null,\"ratingSystemOptions\":null,\"tracking\":null,\"videos\":null," +
            "\"keybindingOverrides\":{\"playPause\":\"space\"},\"playback\":null," +
            "\"homePageContent\":\"home-json\",\"defaultFilters\":null}";

        Assert.Equal(expected, json);
    }
}
