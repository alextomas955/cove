namespace Cove.Core.Contracts;

/// <summary>
/// Catalog of host-defined pane zone keys — the layout regions on a page into which extensions place
/// pane/panel contributions (see <c>UIPaneContribution.Zone</c>). Const-string catalog of the
/// well-known host zones; the set is open so host pages may introduce additional zones. Members are
/// authored in stable alphabetical order to keep downstream code generation deterministic.
/// </summary>
public static class UiZoneKeys
{
    public const string Details = "details";
    public const string Hero = "hero";
    public const string SidebarRight = "sidebar-right";

    /// <summary>All well-known host zone keys, in stable order.</summary>
    public static readonly string[] All =
    [
        Details, Hero, SidebarRight,
    ];
}
