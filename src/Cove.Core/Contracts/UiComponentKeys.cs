namespace Cove.Core.Contracts;

/// <summary>
/// Catalog of host-defined component and selector keys that extensions may override or replace —
/// <c>UIComponentOverride.TargetComponent</c>, <c>UISelectorOverride.SelectorKey</c>, and
/// <c>UIDialogOverride.DialogId</c>. These identify stable host UI surfaces by key. The set is open
/// (the host adds override points over time and extensions may reference their own), so this is a
/// <c>const string</c> catalog of the documented well-known keys. Members are authored in stable
/// alphabetical order to keep downstream code generation deterministic.
/// </summary>
public static class UiComponentKeys
{
    // Component override keys (UIComponentOverride.TargetComponent).
    public const string PerformerCard = "performer.card";
    public const string SearchBar = "search.bar";
    public const string VideoSelector = "video.selector";

    // Selector override keys (UISelectorOverride.SelectorKey).
    public const string PerformerSelector = "performer-selector";
    public const string TagSelector = "tag-selector";

    // Dialog override keys (UIDialogOverride.DialogId).
    public const string ConfirmDelete = "confirm-delete";
    public const string PerformerEdit = "performer-edit";
    public const string VideoEdit = "video-edit";

    /// <summary>All documented well-known component/selector/dialog keys, in stable order.</summary>
    public static readonly string[] All =
    [
        ConfirmDelete, PerformerCard, PerformerEdit, PerformerSelector,
        SearchBar, TagSelector, VideoEdit, VideoSelector,
    ];
}
