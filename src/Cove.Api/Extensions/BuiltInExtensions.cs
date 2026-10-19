using Microsoft.Extensions.DependencyInjection;
using Cove.Plugins;

namespace Cove.Api.Extensions;

// ============================================================================
// Built-in theme collection.
// ============================================================================
public class ThemeCollectionExtension : IExtension, IUIExtension
{
    public string Id => "com.cove.themes";
    public string Name => "Theme Collection";
    public string Version => "1.0.0";
    public string? Description => "Built-in theme, style, and layout collection";
    public string? Author => "Cove";
    public string? Url => null;
    public string? IconUrl => null;
    public IReadOnlyList<string> Categories => [ExtensionCategories.Theme, ExtensionCategories.ColorPalette, ExtensionCategories.Style, ExtensionCategories.Layout];

    public void ConfigureServices(IServiceCollection services, ExtensionContext context) { }

    public UIManifest GetUIManifest() => new()
    {
        ComponentStyles =
        [
            new UIComponentStyleDef("default", "Default", "Balanced corners, defined cards, restrained motion"),
            new UIComponentStyleDef("glass", "Glass", "Frosted glass surfaces with blur and transparency"),
            new UIComponentStyleDef("rounded", "Rounded", "Softer corners and friendlier panel geometry"),
            new UIComponentStyleDef("gradient", "Gradient", "Accent-driven gradients across cards, surfaces, and the background"),
            new UIComponentStyleDef("animated", "Animated", "Lift, shimmer, and accent trails on interactive surfaces"),
            new UIComponentStyleDef("floating", "Floating", "Frameless media-first cards that sit directly on the page"),
            new UIComponentStyleDef("pattern", "Pattern", "A repeating pattern or your own image behind the page, on any theme"),
        ],
        LayoutStyles =
        [
            new UILayoutStyleDef("default", "Default", "Standard layout with top navigation"),
            new UILayoutStyleDef("detail-theater", "Theater Detail", "Places detail metadata in a right rail so media leads the page"),
            new UILayoutStyleDef("detail-tabs", "Detail Tabs", "Uses a horizontal tab strip on media detail pages instead of the side icon rail"),
        ],
        Themes =
        [
            // === Simple: flat colour palettes ===
            new UIThemeDefinition(
                Id: "default",
                Name: "Default",
                Description: "A clean, modern dark theme",
                CssVariables: new()
                {
                    ["--color-background"] = "#16181d",
                    ["--color-nav"] = "#111317",
                    ["--color-card"] = "#1e2028",
                    ["--color-card-hover"] = "#252830",
                    ["--color-surface"] = "#1a1c23",
                    ["--color-border"] = "#2a2d38",
                    ["--color-input"] = "rgba(0, 0, 0, 0.25)",
                    ["--color-accent"] = "#4f8ff7",
                    ["--color-accent-hover"] = "#6ea4ff",
                    ["--color-foreground"] = "#e8eaf0",
                    ["--color-secondary"] = "#9ea3b0",
                    ["--color-muted"] = "#6b7085",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.55)",
                    ["--color-nav-active"] = "#4f8ff7",
                }
            ),
            new UIThemeDefinition(
                Id: "legacy",
                Name: "Legacy",
                Description: "A nostalgic theme",
                CssVariables: new()
                {
                    ["--color-background"] = "#202b33",
                    ["--color-nav"] = "#1a2329",
                    ["--color-card"] = "#30404d",
                    ["--color-card-hover"] = "#394b59",
                    ["--color-surface"] = "#283540",
                    ["--color-border"] = "#394b59",
                    ["--color-input"] = "rgba(16, 22, 26, 0.3)",
                    ["--color-accent"] = "#137cbd",
                    ["--color-accent-hover"] = "#48aff0",
                    ["--color-foreground"] = "#f5f8fa",
                    ["--color-secondary"] = "#bfccd6",
                    ["--color-muted"] = "#8a9ba8",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.6)",
                    ["--color-nav-active"] = "#137cbd",
                }
            ),
            new UIThemeDefinition(
                Id: "light",
                Name: "Light",
                Description: "Clean light theme with blue accents",
                ColorScheme: "light",
                CssVariables: new()
                {
                    ["--color-background"] = "#c5cad4",
                    ["--color-nav"] = "#b8bdc7",
                    ["--color-card"] = "#e0e5ec",
                    ["--color-card-hover"] = "#d6dbe4",
                    ["--color-surface"] = "#d8dde5",
                    ["--color-border"] = "#a8aeb8",
                    ["--color-input"] = "rgba(0, 0, 0, 0.08)",
                    ["--color-accent"] = "#2563eb",
                    ["--color-accent-hover"] = "#1d4ed8",
                    ["--color-foreground"] = "#111827",
                    ["--color-secondary"] = "#4a5060",
                    ["--color-muted"] = "#7a8194",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.3)",
                    ["--color-nav-active"] = "#2563eb",
                    ["--color-shell-bg"] = "#c5cad4",
                    ["--color-shell-nav"] = "#b8bdc7",
                    ["--color-shell-surface"] = "#d8dde5",
                    ["--color-shell-card"] = "#e0e5ec",
                    ["--color-shell-card-hover"] = "#d6dbe4",
                    ["--color-shell-border"] = "#a8aeb8",
                    ["--color-shell-input"] = "rgba(0, 0, 0, 0.08)",
                    ["--color-shell-text"] = "#111827",
                    ["--color-shell-text-secondary"] = "#4a5060",
                    ["--color-shell-text-muted"] = "#7a8194",
                    ["--color-shell-accent"] = "#2563eb",
                    ["--color-shell-accent-hover"] = "#1d4ed8",
                    ["--color-shell-overlay"] = "rgba(0, 0, 0, 0.3)",
                    ["--color-shell-nav-active"] = "#2563eb",
                }
            ),
            new UIThemeDefinition(
                Id: "dark-midnight",
                Name: "Dark Midnight",
                Description: "Deep midnight blue with purple accents",
                CssVariables: new()
                {
                    ["--color-background"] = "#0e1320",
                    ["--color-nav"] = "#141a28",
                    ["--color-card"] = "#1a2230",
                    ["--color-surface"] = "#1e2838",
                    ["--color-border"] = "#2c3a4d",
                    ["--color-accent"] = "#8b5cf6",
                    ["--color-accent-hover"] = "#7c3aed",
                    ["--color-foreground"] = "#e6edf3",
                    ["--color-secondary"] = "#8b949e",
                    ["--color-muted"] = "#484f58",
                    ["--color-nav-active"] = "#06b6d4",
                }
            ),
            new UIThemeDefinition(
                Id: "dark-emerald",
                Name: "Dark Emerald",
                Description: "Dark slate with restrained emerald accents and softer contrast",
                CssVariables: new()
                {
                    ["--color-background"] = "#0d1412",
                    ["--color-nav"] = "#111916",
                    ["--color-card"] = "#18211d",
                    ["--color-card-hover"] = "#1f2a25",
                    ["--color-surface"] = "#151d1a",
                    ["--color-border"] = "#24332d",
                    ["--color-input"] = "rgba(0, 0, 0, 0.24)",
                    ["--color-accent"] = "#3bbd83",
                    ["--color-accent-hover"] = "#5fd6a0",
                    ["--color-foreground"] = "#eef8f2",
                    ["--color-secondary"] = "#9db9ad",
                    ["--color-muted"] = "#648378",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.55)",
                    ["--color-nav-active"] = "#2f9f74",
                }
            ),
            new UIThemeDefinition(
                Id: "dark-rose",
                Name: "Dark Rosé",
                Description: "Dark theme with warm rose accents",
                CssVariables: new()
                {
                    ["--color-background"] = "#1a0e0e",
                    ["--color-nav"] = "#221414",
                    ["--color-card"] = "#2c1a1a",
                    ["--color-surface"] = "#342020",
                    ["--color-border"] = "#482e2e",
                    ["--color-accent"] = "#f43f5e",
                    ["--color-accent-hover"] = "#e11d48",
                    ["--color-foreground"] = "#f0e6e6",
                    ["--color-secondary"] = "#a37c7c",
                    ["--color-muted"] = "#634a4a",
                    ["--color-nav-active"] = "#a855f7",
                }
            ),
            new UIThemeDefinition(
                Id: "dark-ocean",
                Name: "Dark Ocean",
                Description: "Deep ocean blue theme",
                CssVariables: new()
                {
                    ["--color-background"] = "#0a1628",
                    ["--color-nav"] = "#0f1d32",
                    ["--color-card"] = "#14253d",
                    ["--color-surface"] = "#192c47",
                    ["--color-border"] = "#243a5c",
                    ["--color-accent"] = "#0ea5e9",
                    ["--color-accent-hover"] = "#0284c7",
                    ["--color-foreground"] = "#e0f2fe",
                    ["--color-secondary"] = "#7cacca",
                    ["--color-muted"] = "#3b6685",
                    ["--color-nav-active"] = "#06d6a0",
                }
            ),
            new UIThemeDefinition(
                Id: "copper-noir",
                Name: "Copper Noir",
                Description: "High-contrast dark theme with vivid orange accents",
                CssVariables: new()
                {
                    ["--color-background"] = "#000000",
                    ["--color-nav"] = "#1b1b1b",
                    ["--color-card"] = "#1b1b1b",
                    ["--color-card-hover"] = "#272727",
                    ["--color-surface"] = "#1b1b1b",
                    ["--color-border"] = "#333333",
                    ["--color-input"] = "#0d0d0d",
                    ["--color-accent"] = "#ff9000",
                    ["--color-accent-hover"] = "#ffb648",
                    ["--color-foreground"] = "#ffffff",
                    ["--color-secondary"] = "#b5b5b5",
                    ["--color-muted"] = "#6e6e6e",
                    ["--color-overlay"] = "rgba(0,0,0,0.85)",
                    ["--color-nav-active"] = "#e53935",
                }
            ),
            new UIThemeDefinition(
                Id: "golden-hour",
                Name: "Golden Hour",
                Description: "Dark theme with warm gold accents",
                CssVariables: new()
                {
                    ["--color-background"] = "#1f1f1f",
                    ["--color-nav"] = "#191919",
                    ["--color-card"] = "#282828",
                    ["--color-card-hover"] = "#333333",
                    ["--color-surface"] = "#242424",
                    ["--color-border"] = "#3a3a3a",
                    ["--color-input"] = "#141414",
                    ["--color-accent"] = "#e5a00d",
                    ["--color-accent-hover"] = "#cc7b19",
                    ["--color-foreground"] = "#eaeaea",
                    ["--color-secondary"] = "#999999",
                    ["--color-muted"] = "#555555",
                    ["--color-overlay"] = "rgba(0,0,0,0.7)",
                    ["--color-nav-active"] = "#ff6b2b",
                }
            ),
            new UIThemeDefinition(
                Id: "signal-dark",
                Name: "Signal Dark",
                Description: "Dark theme with cool neutrals and bright accent contrast",
                CssVariables: new()
                {
                    ["--color-background"] = "#030303",
                    ["--color-nav"] = "#1a1a1b",
                    ["--color-card"] = "#1a1a1b",
                    ["--color-card-hover"] = "#272729",
                    ["--color-surface"] = "#1a1a1b",
                    ["--color-border"] = "#343536",
                    ["--color-input"] = "#0f0f10",
                    ["--color-accent"] = "#ff4500",
                    ["--color-accent-hover"] = "#ff6733",
                    ["--color-foreground"] = "#d7dadc",
                    ["--color-secondary"] = "#818384",
                    ["--color-muted"] = "#545456",
                    ["--color-overlay"] = "rgba(0,0,0,0.75)",
                    ["--color-nav-active"] = "#0079d3",
                }
            ),
            new UIThemeDefinition(
                Id: "groove",
                Name: "Groove",
                Description: "Near-black with a vivid green accent",
                CssVariables: new()
                {
                    ["--color-background"] = "#121212",
                    ["--color-nav"] = "#000000",
                    ["--color-card"] = "#181818",
                    ["--color-card-hover"] = "#282828",
                    ["--color-surface"] = "#1a1a1a",
                    ["--color-border"] = "#242424",
                    ["--color-input"] = "#2a2a2a",
                    ["--color-accent"] = "#1a9e48",
                    ["--color-accent-hover"] = "#1ed760",
                    ["--color-foreground"] = "#ffffff",
                    ["--color-secondary"] = "#b3b3b3",
                    ["--color-muted"] = "#7a7a7a",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.7)",
                    ["--color-nav-active"] = "#1ed760",
                }
            ),
            new UIThemeDefinition(
                Id: "lounge",
                Name: "Lounge",
                Description: "Soft charcoal greys with a periwinkle-blue accent",
                CssVariables: new()
                {
                    ["--color-background"] = "#313338",
                    ["--color-nav"] = "#2b2d31",
                    ["--color-card"] = "#2b2d31",
                    ["--color-card-hover"] = "#35373c",
                    ["--color-surface"] = "#2b2d31",
                    ["--color-border"] = "#3f4147",
                    ["--color-input"] = "#1e1f22",
                    ["--color-accent"] = "#5865f2",
                    ["--color-accent-hover"] = "#4752c4",
                    ["--color-foreground"] = "#f2f3f5",
                    ["--color-secondary"] = "#dbdee1",
                    ["--color-muted"] = "#949ba4",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.7)",
                    ["--color-nav-active"] = "#ffffff",
                }
            ),
            new UIThemeDefinition(
                Id: "broadcast",
                Name: "Broadcast",
                Description: "Deep black with an electric violet accent",
                CssVariables: new()
                {
                    ["--color-background"] = "#0e0e10",
                    ["--color-nav"] = "#18181b",
                    ["--color-card"] = "#1f1f23",
                    ["--color-card-hover"] = "#26262c",
                    ["--color-surface"] = "#18181b",
                    ["--color-border"] = "#35353b",
                    ["--color-input"] = "#18181b",
                    ["--color-accent"] = "#9147ff",
                    ["--color-accent-hover"] = "#a970ff",
                    ["--color-foreground"] = "#efeff1",
                    ["--color-secondary"] = "#adadb8",
                    ["--color-muted"] = "#7d7d8a",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.7)",
                    ["--color-nav-active"] = "#bf94ff",
                }
            ),
            new UIThemeDefinition(
                Id: "espresso",
                Name: "Espresso",
                Description: "Warm coffee browns with a terracotta accent",
                CssVariables: new()
                {
                    ["--color-background"] = "#1b1715",
                    ["--color-nav"] = "#15110f",
                    ["--color-card"] = "#262120",
                    ["--color-card-hover"] = "#2f2927",
                    ["--color-surface"] = "#201b19",
                    ["--color-border"] = "#3a322e",
                    ["--color-input"] = "rgba(0, 0, 0, 0.25)",
                    ["--color-accent"] = "#c9683f",
                    ["--color-accent-hover"] = "#d98257",
                    ["--color-foreground"] = "#f1e9e1",
                    ["--color-secondary"] = "#b9ada2",
                    ["--color-muted"] = "#8a7d72",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.55)",
                    ["--color-nav-active"] = "#d9a05b",
                }
            ),
            new UIThemeDefinition(
                Id: "reel",
                Name: "Reel",
                Description: "Cool slate with a fresh green accent and orange highlights",
                CssVariables: new()
                {
                    ["--color-background"] = "#14181c",
                    ["--color-nav"] = "#0e1114",
                    ["--color-card"] = "#202830",
                    ["--color-card-hover"] = "#2c3440",
                    ["--color-surface"] = "#1b2129",
                    ["--color-border"] = "#2c3440",
                    ["--color-input"] = "#2c3440",
                    ["--color-accent"] = "#00a832",
                    ["--color-accent-hover"] = "#00e054",
                    ["--color-foreground"] = "#ffffff",
                    ["--color-secondary"] = "#99aabb",
                    ["--color-muted"] = "#667788",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.7)",
                    ["--color-nav-active"] = "#ff8000",
                }
            ),
            new UIThemeDefinition(
                Id: "terminal",
                Name: "Terminal",
                Description: "Warm olive charcoal with hot pink and lime highlights",
                CssVariables: new()
                {
                    ["--color-background"] = "#272822",
                    ["--color-nav"] = "#1e1f1c",
                    ["--color-card"] = "#2d2e27",
                    ["--color-card-hover"] = "#383830",
                    ["--color-surface"] = "#23241f",
                    ["--color-border"] = "#49483e",
                    ["--color-input"] = "#1e1f1c",
                    ["--color-accent"] = "#e5286a",
                    ["--color-accent-hover"] = "#f92672",
                    ["--color-foreground"] = "#f8f8f2",
                    ["--color-secondary"] = "#c5c5bd",
                    ["--color-muted"] = "#8f908a",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.6)",
                    ["--color-nav-active"] = "#a6e22e",
                }
            ),
            new UIThemeDefinition(
                Id: "federation",
                Name: "Federation",
                Description: "Deep blue-grey with an indigo accent",
                CssVariables: new()
                {
                    ["--color-background"] = "#191b22",
                    ["--color-nav"] = "#15171c",
                    ["--color-card"] = "#282c37",
                    ["--color-card-hover"] = "#313543",
                    ["--color-surface"] = "#1f232b",
                    ["--color-border"] = "#393f4f",
                    ["--color-input"] = "#1f232b",
                    ["--color-accent"] = "#6364ff",
                    ["--color-accent-hover"] = "#7b7cff",
                    ["--color-foreground"] = "#ffffff",
                    ["--color-secondary"] = "#d9e1e8",
                    ["--color-muted"] = "#7c88a3",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.7)",
                    ["--color-nav-active"] = "#d9e1e8",
                }
            ),
            new UIThemeDefinition(
                Id: "after-dark",
                Name: "After Dark",
                Description: "Inky black with a hot pink accent",
                CssVariables: new()
                {
                    ["--color-background"] = "#0d0a0e",
                    ["--color-nav"] = "#000000",
                    ["--color-card"] = "#17121a",
                    ["--color-card-hover"] = "#211a25",
                    ["--color-surface"] = "#110d13",
                    ["--color-border"] = "#2b2030",
                    ["--color-input"] = "#0d0a0e",
                    ["--color-accent"] = "#e6007a",
                    ["--color-accent-hover"] = "#ff2d95",
                    ["--color-foreground"] = "#f5eef3",
                    ["--color-secondary"] = "#b59cab",
                    ["--color-muted"] = "#7a6473",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.75)",
                    ["--color-nav-active"] = "#ff6fb5",
                }
            ),
            new UIThemeDefinition(
                Id: "velvet",
                Name: "Velvet",
                Description: "Deep wine with rose accents",
                CssVariables: new()
                {
                    ["--color-background"] = "#1a0d13",
                    ["--color-nav"] = "#12080c",
                    ["--color-card"] = "#28141d",
                    ["--color-card-hover"] = "#331a26",
                    ["--color-surface"] = "#20101a",
                    ["--color-border"] = "#432538",
                    ["--color-input"] = "#12080c",
                    ["--color-accent"] = "#d6336c",
                    ["--color-accent-hover"] = "#f0558a",
                    ["--color-foreground"] = "#f8e9ef",
                    ["--color-secondary"] = "#c9a3b3",
                    ["--color-muted"] = "#8f6e7d",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.65)",
                    ["--color-nav-active"] = "#f5c2d0",
                }
            ),
            // === A little more: a background glow, or bundled styles and layouts ===
            new UIThemeDefinition(
                Id: "abyss",
                Name: "Abyss",
                Description: "Deep blue-black with a faint vignette for depth",
                CssVariables: new()
                {
                    ["--color-background"] = "#050a14",
                    ["--color-nav"] = "#06060b",
                    ["--color-card"] = "#0b0b12",
                    ["--color-card-hover"] = "#11111a",
                    ["--color-surface"] = "#08080d",
                    ["--color-border"] = "#16161f",
                    ["--color-input"] = "#030306",
                    ["--color-accent"] = "#0a84ff",
                    ["--color-accent-hover"] = "#5ac8fa",
                    ["--color-foreground"] = "#f0f0f3",
                    ["--color-secondary"] = "#9a9aa0",
                    ["--color-muted"] = "#66666b",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.6)",
                    ["--color-nav-active"] = "#4da3ff",
                    // Depth only, not a colour shift: a hint of lift at the top and a faint vignette at the
                    // edges. Fixed to the viewport; it stays under a Pattern.
                    ["--theme-bg-glow"] = "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(255, 255, 255, 0.018) 0%, transparent 60%), radial-gradient(ellipse 140% 120% at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.28) 100%)",
                }
            ),
            new UIThemeDefinition(
                Id: "cinema-dark",
                Name: "Cinema Dark",
                Description: "Dark video-first browsing with red accents and floating media tiles",
                CssVariables: new()
                {
                    ["--color-background"] = "#0f0f0f",
                    ["--color-nav"] = "#111111",
                    ["--color-card"] = "#181818",
                    ["--color-card-hover"] = "#242424",
                    ["--color-surface"] = "#1a1a1a",
                    ["--color-border"] = "#303030",
                    ["--color-input"] = "#121212",
                    ["--color-accent"] = "#ff0033",
                    ["--color-accent-hover"] = "#ff4e45",
                    ["--color-foreground"] = "#f1f1f1",
                    ["--color-secondary"] = "#c0c0c0",
                    ["--color-muted"] = "#8b8b8b",
                    ["--color-overlay"] = "rgba(0,0,0,0.7)",
                    ["--color-nav-active"] = "#ffffff",
                },
                ComponentStyle: "floating",
                LayoutStyle: "detail-theater detail-tabs"
            ),
            // === Gradient and animated backgrounds ===
            new UIThemeDefinition(
                Id: "rainbow",
                Name: "Rainbow",
                Description: "Vivid multi-color rainbow gradient with deep dark base",
                CssVariables: new()
                {
                    ["--color-background"] = "#08080f",
                    ["--color-nav"] = "#0c0c16",
                    ["--color-card"] = "#12121e",
                    ["--color-card-hover"] = "#1a1a28",
                    ["--color-surface"] = "#0e0e18",
                    ["--color-border"] = "#1e1e2e",
                    ["--color-input"] = "#08080f",
                    ["--color-accent"] = "#a855f7",
                    ["--color-accent-hover"] = "#c084fc",
                    ["--color-foreground"] = "#f5f5f7",
                    ["--color-secondary"] = "#a1a1b0",
                    ["--color-muted"] = "#636370",
                    ["--color-overlay"] = "rgba(0,0,0,0.4)",
                    ["--color-nav-active"] = "#ec4899",
                },
                ComponentStyle: "glass gradient animated"
            ),
            new UIThemeDefinition(
                Id: "liquid-glass",
                Name: "Liquid Glass",
                Description: "Dramatic translucent glass with vivid gradient highlights",
                CssVariables: new()
                {
                    ["--color-background"] = "#0a0a12",
                    ["--color-nav"] = "#0e0e18",
                    ["--color-card"] = "#14141e",
                    ["--color-card-hover"] = "#1c1c28",
                    ["--color-surface"] = "#10101a",
                    ["--color-border"] = "#22222e",
                    ["--color-input"] = "#0a0a12",
                    ["--color-accent"] = "#007aff",
                    ["--color-accent-hover"] = "#5ac8fa",
                    ["--color-foreground"] = "#f5f5f7",
                    ["--color-secondary"] = "#a1a1a6",
                    ["--color-muted"] = "#636366",
                    ["--color-overlay"] = "rgba(0,0,0,0.3)",
                    ["--color-nav-active"] = "#bf5af2",
                },
                BackgroundAnimation: "liquid-drift"
            ),
            new UIThemeDefinition(
                Id: "neon-glow",
                Name: "Neon Glow",
                Description: "Animated purple-blue gradient with pulsing borders and frosted glass",
                CssVariables: new()
                {
                    ["--color-background"] = "#0c0b1e",
                    ["--color-nav"] = "#121026",
                    ["--color-card"] = "#1e1a38",
                    ["--color-card-hover"] = "#2a2648",
                    ["--color-surface"] = "#181430",
                    ["--color-border"] = "#302a58",
                    ["--color-input"] = "#0a0a14",
                    ["--color-accent"] = "#8b5cf6",
                    ["--color-accent-hover"] = "#a78bfa",
                    ["--color-foreground"] = "#f0eeff",
                    ["--color-secondary"] = "#9d8ec2",
                    ["--color-muted"] = "#5b4f7a",
                    ["--color-overlay"] = "rgba(0,0,0,0.6)",
                    ["--color-nav-active"] = "#06d6a0",
                },
                ComponentStyle: "glass gradient animated"
            ),
            new UIThemeDefinition(
                Id: "sunset-gradient",
                Name: "Sunset Gradient",
                Description: "Warm animated gradient from orange through rose to purple",
                CssVariables: new()
                {
                    ["--color-background"] = "#120c0e",
                    ["--color-nav"] = "#181012",
                    ["--color-card"] = "#281c20",
                    ["--color-card-hover"] = "#36262a",
                    ["--color-surface"] = "#20161a",
                    ["--color-border"] = "#3a2028",
                    ["--color-input"] = "#100a0c",
                    ["--color-accent"] = "#f97316",
                    ["--color-accent-hover"] = "#fb923c",
                    ["--color-foreground"] = "#fef2f2",
                    ["--color-secondary"] = "#c2918a",
                    ["--color-muted"] = "#785450",
                    ["--color-overlay"] = "rgba(0,0,0,0.6)",
                    ["--color-nav-active"] = "#e11d48",
                },
                ComponentStyle: "glass gradient animated"
            ),
            new UIThemeDefinition(
                Id: "aurora",
                Name: "Aurora",
                Description: "Shimmering northern lights with teal and purple hues",
                CssVariables: new()
                {
                    ["--color-background"] = "#080e0c",
                    ["--color-nav"] = "#0e1612",
                    ["--color-card"] = "#182822",
                    ["--color-card-hover"] = "#22342c",
                    ["--color-surface"] = "#14221c",
                    ["--color-border"] = "#1e3428",
                    ["--color-input"] = "#080e0c",
                    ["--color-accent"] = "#10b981",
                    ["--color-accent-hover"] = "#34d399",
                    ["--color-foreground"] = "#ecfdf5",
                    ["--color-secondary"] = "#86b8a0",
                    ["--color-muted"] = "#4a7562",
                    ["--color-overlay"] = "rgba(0,0,0,0.5)",
                    ["--color-nav-active"] = "#818cf8",
                },
                ComponentStyle: "glass gradient animated"
            ),
            new UIThemeDefinition(
                Id: "cyberpunk",
                Name: "Cyberpunk",
                Description: "Electric cyan, acid gold, and sharp noir surfaces with hard neon contrast",
                CssVariables: new()
                {
                    ["--color-background"] = "#08090d",
                    ["--color-nav"] = "#0b0f14",
                    ["--color-card"] = "#101722",
                    ["--color-card-hover"] = "#17212e",
                    ["--color-surface"] = "#0e141f",
                    ["--color-border"] = "#1f3141",
                    ["--color-input"] = "#06090d",
                    ["--color-accent"] = "#00eaff",
                    ["--color-accent-hover"] = "#ff4fd8",
                    ["--color-foreground"] = "#f4fbff",
                    ["--color-secondary"] = "#9fc5d4",
                    ["--color-muted"] = "#547184",
                    ["--color-overlay"] = "rgba(0,0,0,0.65)",
                    ["--color-nav-active"] = "#ffe45c",
                },
                BackgroundAnimation: "liquid-drift"
            ),
            new UIThemeDefinition(
                Id: "deep-space",
                Name: "Deep Space",
                Description: "Cosmic nebula with blue, magenta, and violet — an interstellar journey",
                CssVariables: new()
                {
                    ["--color-background"] = "#060610",
                    ["--color-nav"] = "#0a0a18",
                    ["--color-card"] = "#12101e",
                    ["--color-card-hover"] = "#1c1828",
                    ["--color-surface"] = "#0e0c16",
                    ["--color-border"] = "#1e1830",
                    ["--color-input"] = "#060610",
                    ["--color-accent"] = "#6366f1",
                    ["--color-accent-hover"] = "#f472b6",
                    ["--color-foreground"] = "#eef0ff",
                    ["--color-secondary"] = "#9498c8",
                    ["--color-muted"] = "#4c4e72",
                    ["--color-overlay"] = "rgba(0,0,0,0.5)",
                    ["--color-nav-active"] = "#a78bfa",
                },
                BackgroundAnimation: "liquid-drift"
            ),
            new UIThemeDefinition(
                Id: "synthwave",
                Name: "Synthwave",
                Description: "Violet dusk, sunset orange, and pop magenta for a warmer 80s neon feel",
                CssVariables: new()
                {
                    ["--color-background"] = "#14071f",
                    ["--color-nav"] = "#1a0a28",
                    ["--color-card"] = "#24103a",
                    ["--color-card-hover"] = "#2f1748",
                    ["--color-surface"] = "#1d0d31",
                    ["--color-border"] = "#47205f",
                    ["--color-input"] = "#0d0418",
                    ["--color-accent"] = "#ff5cab",
                    ["--color-accent-hover"] = "#7c6dff",
                    ["--color-foreground"] = "#fbeeff",
                    ["--color-secondary"] = "#c09bd8",
                    ["--color-muted"] = "#7e5a97",
                    ["--color-overlay"] = "rgba(0,0,0,0.62)",
                    ["--color-nav-active"] = "#ffb86b",
                },
                BackgroundAnimation: "liquid-drift"
            ),
            new UIThemeDefinition(
                Id: "ember",
                Name: "Ember",
                Description: "Warm embers — deep reds, burnt oranges, and golden highlights in darkness",
                CssVariables: new()
                {
                    ["--color-background"] = "#100804",
                    ["--color-nav"] = "#180c06",
                    ["--color-card"] = "#221208",
                    ["--color-card-hover"] = "#2e1a0e",
                    ["--color-surface"] = "#1c1008",
                    ["--color-border"] = "#3a2010",
                    ["--color-input"] = "#0e0604",
                    ["--color-accent"] = "#f97316",
                    ["--color-accent-hover"] = "#fbbf24",
                    ["--color-foreground"] = "#fff5e8",
                    ["--color-secondary"] = "#c8946a",
                    ["--color-muted"] = "#7a5238",
                    ["--color-overlay"] = "rgba(0,0,0,0.6)",
                    ["--color-nav-active"] = "#ef4444",
                },
                BackgroundAnimation: "liquid-drift"
            ),
            // === Patterns: the Pattern style on by default ===
            new UIThemeDefinition(
                Id: "honeycomb",
                Name: "Honeycomb",
                Description: "Charcoal and amber over a faint honeycomb",
                CssVariables: new()
                {
                    ["--color-background"] = "#121214",
                    ["--color-nav"] = "#0c0c0d",
                    ["--color-card"] = "#1b1b1e",
                    ["--color-card-hover"] = "#242428",
                    ["--color-surface"] = "#161618",
                    ["--color-border"] = "#2a2a2f",
                    ["--color-input"] = "#0c0c0d",
                    ["--color-accent"] = "#d97706",
                    ["--color-accent-hover"] = "#f59e0b",
                    ["--color-foreground"] = "#f4f4f5",
                    ["--color-secondary"] = "#b4b4ba",
                    ["--color-muted"] = "#7c7c84",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.7)",
                    ["--color-nav-active"] = "#fbbf24",
                },
                ComponentStyle: "pattern"
            )
            {
                StyleOptions = new()
                {
                    ["pattern"] = new()
                    {
                        ["kind"] = "hex",
                        ["tint"] = "white",
                        ["keepcolors"] = "off",
                        ["opacity"] = "4",
                        ["scale"] = "175",
                    },
                },
            },
            new UIThemeDefinition(
                Id: "sakura",
                Name: "Sakura",
                Description: "Plum charcoal with blossom pinks and cherry branches",
                CssVariables: new()
                {
                    ["--color-background"] = "#1e181d",
                    ["--color-nav"] = "#171216",
                    ["--color-card"] = "#2a2129",
                    ["--color-card-hover"] = "#342a33",
                    ["--color-surface"] = "#231c22",
                    ["--color-border"] = "#3f3340",
                    ["--color-input"] = "#171216",
                    ["--color-accent"] = "#d9608f",
                    ["--color-accent-hover"] = "#f08ab1",
                    ["--color-foreground"] = "#f9eef4",
                    ["--color-secondary"] = "#cbb3c1",
                    ["--color-muted"] = "#917f8a",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.6)",
                    ["--color-nav-active"] = "#ffb3d1",
                },
                ComponentStyle: "pattern"
            )
            {
                StyleOptions = new()
                {
                    ["pattern"] = new()
                    {
                        ["kind"] = "custom",
                        ["source"] = "/patterns/sakura-branches.svg",
                        ["sourcekind"] = "svg",
                        ["sourcewidth"] = "480",
                        ["keepcolors"] = "on",
                        ["opacity"] = "50",
                        ["scale"] = "300",
                    },
                },
            },
            new UIThemeDefinition(
                Id: "burgundy",
                Name: "Burgundy",
                Description: "Muted wine with antique gold and a soft argyle texture",
                CssVariables: new()
                {
                    ["--color-background"] = "#1a1416",
                    ["--color-nav"] = "#140f11",
                    ["--color-card"] = "#241a1d",
                    ["--color-card-hover"] = "#2d2125",
                    ["--color-surface"] = "#1f1719",
                    ["--color-border"] = "#3a2b2f",
                    ["--color-input"] = "#140f11",
                    ["--color-accent"] = "#933a48",
                    ["--color-accent-hover"] = "#a84a59",
                    ["--color-foreground"] = "#f0e6e6",
                    ["--color-secondary"] = "#bfaeb0",
                    ["--color-muted"] = "#8a7a7d",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.65)",
                    ["--color-nav-active"] = "#c9a96e",
                },
                ComponentStyle: "pattern"
            )
            {
                StyleOptions = new()
                {
                    ["pattern"] = new()
                    {
                        ["kind"] = "custom",
                        ["source"] = "https://transparenttextures.com/patterns/argyle.png",
                        ["sourcekind"] = "image",
                        ["fit"] = "tile",
                        ["opacity"] = "50",
                        ["scale"] = "125",
                        ["dim"] = "25",
                    },
                },
            },
            // === Pictures: a bundled photo behind floating cards (Unsplash Licence, ui/public/backgrounds) ===
            new UIThemeDefinition(
                Id: "nebula",
                Name: "Nebula",
                Description: "Deep-space navy over a dimmed star field, with a bright blue accent",
                CssVariables: new()
                {
                    ["--color-background"] = "#0a0d14",
                    ["--color-nav"] = "#080a10",
                    ["--color-card"] = "#11151f",
                    ["--color-card-hover"] = "#181d2a",
                    ["--color-surface"] = "#0d1018",
                    ["--color-border"] = "#222838",
                    ["--color-input"] = "#080a10",
                    ["--color-accent"] = "#1a8fd6",
                    ["--color-accent-hover"] = "#45aaf0",
                    ["--color-foreground"] = "#e8edf5",
                    ["--color-secondary"] = "#a3adbd",
                    ["--color-muted"] = "#6f7889",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.65)",
                    ["--color-nav-active"] = "#ffb347",
                },
                ComponentStyle: "floating pattern"
            )
            {
                StyleOptions = new()
                {
                    ["pattern"] = new()
                    {
                        ["kind"] = "custom",
                        ["source"] = "/backgrounds/nebula.jpg",
                        ["sourcekind"] = "image",
                        ["sourcewidth"] = "1920",
                        ["fit"] = "cover",
                        ["opacity"] = "60",
                        ["dim"] = "45",
                        ["scale"] = "100",
                    },
                },
            },
            new UIThemeDefinition(
                Id: "rainfall",
                Name: "Rainfall",
                Description: "Rain on glass over night-time city glow, with a teal accent",
                CssVariables: new()
                {
                    ["--color-background"] = "#0a100f",
                    ["--color-nav"] = "#070b0b",
                    ["--color-card"] = "#111817",
                    ["--color-card-hover"] = "#17201f",
                    ["--color-surface"] = "#0d1312",
                    ["--color-border"] = "#1f2a28",
                    ["--color-input"] = "#070b0b",
                    ["--color-accent"] = "#14b8a6",
                    ["--color-accent-hover"] = "#2dd4bf",
                    ["--color-foreground"] = "#ecece6",
                    ["--color-secondary"] = "#aab0a8",
                    ["--color-muted"] = "#757c75",
                    ["--color-overlay"] = "rgba(0, 0, 0, 0.65)",
                    ["--color-nav-active"] = "#7ee8d8",
                },
                ComponentStyle: "floating pattern"
            )
            {
                StyleOptions = new()
                {
                    ["pattern"] = new()
                    {
                        ["kind"] = "custom",
                        ["source"] = "/backgrounds/rainfall.jpg",
                        ["sourcekind"] = "image",
                        ["sourcewidth"] = "1920",
                        ["fit"] = "cover",
                        ["opacity"] = "70",
                        ["dim"] = "35",
                        ["scale"] = "100",
                    },
                },
            },
        ]
    };
}
