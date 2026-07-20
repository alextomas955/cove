namespace Cove.Core.Contracts;

/// <summary>
/// Catalog of host-defined extension action types — the placement kind of an
/// <c>ExtensionAction.ActionType</c>: a toolbar button, a context-menu item, or a bulk (multi-select)
/// action. Modeled as a <c>const string</c> catalog (matching <c>ExtensionCategories</c>) so it stays
/// wire-compatible with the existing string-typed action contract. Members are authored in stable
/// alphabetical order to keep downstream code generation deterministic.
/// </summary>
public static class ExtensionActionKinds
{
    public const string Bulk = "bulk";
    public const string ContextMenu = "context-menu";
    public const string Toolbar = "toolbar";

    /// <summary>All host-defined action-type tokens, in stable order.</summary>
    public static readonly string[] All =
    [
        Bulk, ContextMenu, Toolbar,
    ];
}
