using System.Reflection;
using Cove.Api.Services;
using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Cove.Api.Extensions;

namespace Cove.Tests;

/// <summary>
/// Tests for fingerprint matching fixes (oshash formatting, metadata-server query structure,
/// theme system registration).
/// </summary>
public class FingerprintMatchingTests
{
    /// <summary>
    /// Validates that oshash formatting matches the standard format (zero-padded 16-char hex).
    /// Go uses: fmt.Sprintf("%016x", result) â†’ always 16 characters, zero-padded
    /// C# must use: ToString("x16") â†’ 16-char zero-padded
    /// </summary>
    [Theory]
    [InlineData(0x123456789abcdef0UL, "123456789abcdef0")]
    [InlineData(0x00abcdef12345678UL, "00abcdef12345678")]   // leading zeros preserved
    [InlineData(0x0000000000000001UL, "0000000000000001")]   // fully padded
    [InlineData(0xffffffffffffffffUL, "ffffffffffffffff")]   // max
    public void OshashFormat_MatchesGoZeroPaddedHex(ulong hash, string expected)
    {
        // This is the same format used in ScanService.ComputeOshashAsync
        var result = hash.ToString("x16");
        Assert.Equal(expected, result);
    }

    /// <summary>
    /// Verifies that unpadded format (the old buggy behavior) would NOT match Go output
    /// for values with leading zeros.
    /// </summary>
    [Fact]
    public void OshashFormat_UnpaddedDoesNotMatchForShortHashes()
    {
        ulong hash = 0x00abcdef12345678UL;
        var padded = hash.ToString("x16");    // fixed format (matches Go)
        var unpadded = hash.ToString("x");    // old buggy format

        Assert.Equal("00abcdef12345678", padded);
        Assert.Equal("abcdef12345678", unpadded);
        Assert.NotEqual(padded, unpadded);
    }

    /// <summary>
    /// Validates that phash formatting uses unpadded hex (same as Go).
    /// </summary>
    [Theory]
    [InlineData(0x0123456789abcdefUL, "123456789abcdef")]
    [InlineData(0xfedcba9876543210UL, "fedcba9876543210")]
    public void PhashFormat_MatchesGoUnpaddedHex(ulong hash, string expected)
    {
        var result = hash.ToString("x");
        Assert.Equal(expected, result);
    }

    /// <summary>
    /// Fingerprint hash comparison should be case-insensitive (metadata-server returns
    /// lowercase, but we should handle any case).
    /// </summary>
    [Fact]
    public void FingerprintHashComparison_IsCaseInsensitive()
    {
        var localHash = "abcdef1234567890";
        var remoteHash = "ABCDEF1234567890";

        Assert.Equal(localHash, remoteHash, ignoreCase: true);
    }

    [Fact]
    public void FingerprintQueries_GroupFingerprintsIntoSingleBatchWithStablePriority()
    {
        var video = new Video();
        var file = new VideoFile();
        file.Fingerprints.Add(new FileFingerprint { Type = "phash", Value = "ffff" });
        file.Fingerprints.Add(new FileFingerprint { Type = "md5", Value = "abc123" });
        file.Fingerprints.Add(new FileFingerprint { Type = "oshash", Value = "1a2b" });
        video.Files.Add(file);

        var batches = InvokeFingerprintQueries(video);

        var batch = Assert.Single(batches);
        Assert.Equal(["MD5", "OSHASH", "PHASH"], batch.Select(item => GetAnonymousString(item, "algorithm")).ToArray());
        Assert.Equal(["abc123", "0000000000001a2b", "ffff"], batch.Select(item => GetAnonymousString(item, "hash")).ToArray());
    }

    [Fact]
    public void VideoSearchTerms_StripLeadingNumericPrefix()
    {
        var result = InvokeVideoSearchTerms("144 - Two Dragon Cumshots For Boosette");

        Assert.Equal("144 - Two Dragon Cumshots For Boosette", result[0]);
        Assert.Contains("Two Dragon Cumshots For Boosette", result);
    }

    [Fact]
    public void VideoSearchTerms_DoNotDuplicateEquivalentTerms()
    {
        var result = InvokeVideoSearchTerms("Two Dragon Cumshots For Boosette");

        Assert.Single(result);
        Assert.Equal("Two Dragon Cumshots For Boosette", result[0]);
    }

    private static IReadOnlyList<string> InvokeVideoSearchTerms(string term)
    {
        var method = typeof(MetadataServerService).GetMethod("BuildVideoSearchTerms", BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(method);

        var result = method!.Invoke(null, [term]);
        var terms = Assert.IsAssignableFrom<IReadOnlyList<string>>(result);
        return terms;
    }

    private static List<List<object>> InvokeFingerprintQueries(Video video)
    {
        var method = typeof(MetadataServerService).GetMethod("BuildFingerprintQueries", BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(method);

        var result = method!.Invoke(null, [video]);
        var outer = Assert.IsAssignableFrom<System.Collections.IEnumerable>(result)
            .Cast<object>()
            .ToList();

        return outer
            .Select(batch => Assert.IsAssignableFrom<System.Collections.IEnumerable>(batch).Cast<object>().ToList())
            .ToList();
    }

    private static string GetAnonymousString(object value, string propertyName)
    {
        var property = value.GetType().GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase);
        Assert.NotNull(property);
        return Assert.IsType<string>(property!.GetValue(value));
    }
}

/// <summary>
/// Tests for the theme system registration and built-in themes.
/// </summary>
public class ThemeSystemTests
{
    [Fact]
    public void ThemeCollectionExtension_ReturnsAllBuiltInThemes()
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();

        // Keep this in sync with ThemeCollectionExtension built-ins.
        Assert.Equal(35, manifest.Themes.Count);
    }

    [Theory]
    [InlineData("default")]
    [InlineData("legacy")]
    [InlineData("light")]
    [InlineData("dark-midnight")]
    [InlineData("dark-emerald")]
    [InlineData("dark-rose")]
    [InlineData("dark-ocean")]
    [InlineData("copper-noir")]
    [InlineData("golden-hour")]
    [InlineData("signal-dark")]
    [InlineData("groove")]
    [InlineData("lounge")]
    [InlineData("broadcast")]
    [InlineData("espresso")]
    [InlineData("reel")]
    [InlineData("terminal")]
    [InlineData("federation")]
    [InlineData("sakura")]
    [InlineData("after-dark")]
    [InlineData("velvet")]
    [InlineData("burgundy")]
    [InlineData("honeycomb")]
    [InlineData("abyss")]
    [InlineData("nebula")]
    [InlineData("rainfall")]
    [InlineData("rainbow")]
    [InlineData("liquid-glass")]
    [InlineData("neon-glow")]
    [InlineData("sunset-gradient")]
    [InlineData("aurora")]
    [InlineData("cyberpunk")]
    [InlineData("deep-space")]
    [InlineData("synthwave")]
    [InlineData("ember")]
    [InlineData("cinema-dark")]
    public void ThemeCollectionExtension_ContainsTheme(string themeId)
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();

        var theme = manifest.Themes.FirstOrDefault(t => t.Id == themeId);
        Assert.NotNull(theme);
    }

    [Theory]
    [InlineData("copper-noir", "#ff9000")]
    [InlineData("golden-hour", "#e5a00d")]
    [InlineData("signal-dark", "#ff4500")]
    [InlineData("liquid-glass", "#007aff")]
    [InlineData("neon-glow", "#8b5cf6")]
    [InlineData("sunset-gradient", "#f97316")]
    [InlineData("aurora", "#10b981")]
    [InlineData("cyberpunk", "#00eaff")]
    [InlineData("deep-space", "#6366f1")]
    [InlineData("synthwave", "#ff5cab")]
    [InlineData("ember", "#f97316")]
    [InlineData("cinema-dark", "#ff0033")]
    public void NewThemes_HaveCorrectAccentColor(string themeId, string expectedAccent)
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();
        var theme = manifest.Themes.First(t => t.Id == themeId);

        Assert.NotNull(theme.CssVariables);
        Assert.Equal(expectedAccent, theme.CssVariables["--color-accent"]);
    }

    [Theory]
    [InlineData("groove")]
    [InlineData("lounge")]
    [InlineData("broadcast")]
    [InlineData("espresso")]
    [InlineData("reel")]
    [InlineData("terminal")]
    [InlineData("federation")]
    [InlineData("after-dark")]
    [InlineData("velvet")]
    public void CleanThemes_AreFlatPalettesOnly(string themeId)
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();
        var theme = manifest.Themes.First(t => t.Id == themeId);

        Assert.Null(theme.ComponentStyle);
        Assert.Null(theme.LayoutStyle);
        Assert.Null(theme.BackgroundAnimation);
        Assert.Null(theme.ColorScheme);
        Assert.Null(theme.StyleOptions);
    }

    [Fact]
    public void Abyss_IsABlueOnlyGlowOverNearBlack()
    {
        var ext = new ThemeCollectionExtension();
        var theme = ext.GetUIManifest().Themes.First(t => t.Id == "abyss");

        Assert.NotNull(theme.CssVariables);
        Assert.Equal("#050a14", theme.CssVariables["--color-background"]);
        // The glow is a gradient layer of its own, so a Pattern on top does not remove it.
        Assert.StartsWith("radial-gradient(", theme.CssVariables["--theme-bg-glow"]);
        Assert.False(theme.CssVariables.ContainsKey("--theme-bg-image"));
        Assert.Null(theme.ComponentStyle);
        Assert.Null(theme.BackgroundAnimation);
    }

    [Fact]
    public void Themes_AreListedSimplestFirst()
    {
        // Settings shows themes in manifest order: flat palettes, then a little extra, then
        // gradient/animated, then patterns, then photos.
        var ids = new ThemeCollectionExtension().GetUIManifest().Themes.Select(t => t.Id).ToList();
        int Pos(string id) => ids.IndexOf(id);

        Assert.Equal("default", ids[0]);
        Assert.True(Pos("velvet") < Pos("abyss"));
        Assert.True(Pos("cinema-dark") < Pos("rainbow"));
        Assert.True(Pos("ember") < Pos("honeycomb"));
        Assert.True(Pos("burgundy") < Pos("nebula"));
        Assert.Equal("rainfall", ids[^1]);
    }

    [Theory]
    [InlineData("nebula")]
    [InlineData("rainfall")]
    public void PictureThemes_DefaultToFloatingCardsOverACoverPhoto(string themeId)
    {
        var theme = new ThemeCollectionExtension().GetUIManifest().Themes.First(t => t.Id == themeId);

        Assert.Equal(["floating", "pattern"], (theme.ComponentStyle ?? "").Split(' '));
        Assert.NotNull(theme.StyleOptions);
        Assert.Equal("cover", theme.StyleOptions["pattern"]["fit"]);
        Assert.True(File.Exists(Path.Combine(FindRepoRoot(), "ui", "public", "backgrounds", $"{themeId}.jpg")));
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, "ui", "public"))) dir = dir.Parent;
        return dir?.FullName ?? throw new InvalidOperationException("Repository root not found.");
    }

    [Fact]
    public void AnimatedBackgroundThemes_RecommendNearlyClearGlass()
    {
        var themes = new ThemeCollectionExtension().GetUIManifest().Themes
            .Where(t => t.BackgroundAnimation is not null)
            .ToList();

        Assert.Equal(["liquid-glass", "cyberpunk", "deep-space", "synthwave", "ember"], themes.Select(t => t.Id));
        foreach (var theme in themes)
        {
            // Their surfaces follow the Glass sliders like any other theme; these values keep the
            // moving background visible through them.
            Assert.NotNull(theme.StyleOptions);
            Assert.Equal("12", theme.StyleOptions["glass"]["opacity"]);
            Assert.Equal("10", theme.StyleOptions["glass"]["cardopacity"]);
        }
    }

    [Theory]
    [InlineData("honeycomb", "kind", "hex")]
    [InlineData("sakura", "source", "/patterns/sakura-branches.svg")]
    [InlineData("burgundy", "kind", "argyle")]
    [InlineData("nebula", "source", "/backgrounds/nebula.jpg")]
    [InlineData("rainfall", "source", "/backgrounds/rainfall.jpg")]
    public void PatternThemes_RecommendThePatternStyleWithTheirOwnOptions(string themeId, string option, string expected)
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();
        var theme = manifest.Themes.First(t => t.Id == themeId);

        // The pattern is a recommendation the user can turn off, not baked into the palette.
        Assert.Contains("pattern", (theme.ComponentStyle ?? "").Split(' '));
        Assert.False(theme.CssVariables?.ContainsKey("--theme-bg-image") ?? false);
        Assert.NotNull(theme.StyleOptions);
        Assert.Equal(expected, theme.StyleOptions["pattern"][option]);
    }

    [Fact]
    public void ThemeCollectionExtension_ContainsP7StyleAndLayoutPresets()
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();

        Assert.Contains(manifest.ComponentStyles, style => style.Id == "floating");
        Assert.DoesNotContain(manifest.ComponentStyles, style => style.Id == "minimal");
        Assert.Contains(manifest.LayoutStyles, layout => layout.Id == "detail-theater");
        Assert.Contains(manifest.LayoutStyles, layout => layout.Id == "detail-tabs");
        Assert.DoesNotContain(manifest.LayoutStyles, layout => layout.Id == "control-rail");
        Assert.DoesNotContain(manifest.LayoutStyles, layout => layout.Id == "compact");
        Assert.DoesNotContain(manifest.LayoutStyles, layout => layout.Id == "wide");
    }

    [Fact]
    public void CinemaDarkTheme_BundlesFloatingCardsAndTheaterLayout()
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();
        var theme = manifest.Themes.First(t => t.Id == "cinema-dark");

        Assert.Equal("floating", theme.ComponentStyle);
        Assert.Equal("detail-theater detail-tabs", theme.LayoutStyle);
    }

    [Fact]
    public void LiquidGlassTheme_HasBackgroundAnimation()
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();
        var theme = manifest.Themes.First(t => t.Id == "liquid-glass");

        Assert.NotNull(theme.CssVariables);
        // Liquid glass theme has a background animation
        Assert.Equal("liquid-drift", theme.BackgroundAnimation);
    }

    [Fact]
    public void DefaultTheme_DefinesItsOwnCssVariables()
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();
        var defaultTheme = manifest.Themes.First(t => t.Id == "default");

        Assert.NotNull(defaultTheme.CssVariables);
        Assert.Equal("#16181d", defaultTheme.CssVariables!["--color-background"]);
    }

    [Fact]
    public void LegacyTheme_HasPaletteDistinctFromDefault()
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();
        var legacy = manifest.Themes.First(t => t.Id == "legacy");
        var defaultTheme = manifest.Themes.First(t => t.Id == "default");

        // Legacy once relied on the base CSS @theme values, so it silently became a
        // duplicate of Default when that block was retuned. It now carries its own palette.
        Assert.NotNull(legacy.CssVariables);
        Assert.NotEqual(
            defaultTheme.CssVariables!["--color-background"],
            legacy.CssVariables!["--color-background"]);
        Assert.NotEqual(
            defaultTheme.CssVariables["--color-accent"],
            legacy.CssVariables["--color-accent"]);
    }

    [Fact]
    public void AllThemes_DefineCssVariables()
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();

        // A theme with no CssVariables renders as whatever the baked-in @theme block
        // happens to be, which makes it indistinguishable from Default.
        foreach (var theme in manifest.Themes)
        {
            Assert.True(theme.CssVariables is { Count: > 0 },
                $"Theme '{theme.Id}' defines no CSS variables and will inherit the base palette");
        }
    }

    [Fact]
    public void AllThemes_HaveRequiredFields()
    {
        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();

        foreach (var theme in manifest.Themes)
        {
            Assert.False(string.IsNullOrEmpty(theme.Id));
            Assert.False(string.IsNullOrEmpty(theme.Name));
            Assert.False(string.IsNullOrEmpty(theme.Description));
        }
    }

    [Fact]
    public void AllThemesWithColors_HaveCompleteColorSet()
    {
        var requiredVars = new[]
        {
            "--color-background", "--color-nav", "--color-card",
            "--color-surface", "--color-border", "--color-accent",
            "--color-foreground", "--color-secondary", "--color-muted"
        };

        var ext = new ThemeCollectionExtension();
        var manifest = ext.GetUIManifest();

        foreach (var theme in manifest.Themes.Where(t => t.CssVariables != null))
        {
            foreach (var varName in requiredVars)
            {
                Assert.True(theme.CssVariables!.ContainsKey(varName),
                    $"Theme '{theme.Id}' missing required CSS variable: {varName}");
            }
        }
    }
}

/// <summary>
/// Tests for sub-tag depth deserialization from frontend JSON.
/// </summary>
public class SubTagFilterTests
{
    private static readonly System.Text.Json.JsonSerializerOptions Options = new(System.Text.Json.JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter(System.Text.Json.JsonNamingPolicy.CamelCase) }
    };

    [Fact]
    public void Deserialize_MultiIdCriterion_WithDepthMinusOne()
    {
        var json = """{"value": [42], "modifier": "includesAll", "depth": -1}""";
        var result = System.Text.Json.JsonSerializer.Deserialize<MultiIdCriterion>(json, Options);

        Assert.NotNull(result);
        Assert.Equal(-1, result.Depth);
        Assert.Equal(CriterionModifier.IncludesAll, result.Modifier);
    }

    [Fact]
    public void Deserialize_MultiIdCriterion_WithoutDepth_DefaultsToNull()
    {
        var json = """{"value": [42], "modifier": "includes"}""";
        var result = System.Text.Json.JsonSerializer.Deserialize<MultiIdCriterion>(json, Options);

        Assert.NotNull(result);
        Assert.Null(result.Depth);
    }

    [Fact]
    public void Deserialize_MultiIdCriterion_WithDepthZero()
    {
        var json = """{"value": [42], "modifier": "includes", "depth": 0}""";
        var result = System.Text.Json.JsonSerializer.Deserialize<MultiIdCriterion>(json, Options);

        Assert.NotNull(result);
        Assert.Equal(0, result.Depth);
    }
}

