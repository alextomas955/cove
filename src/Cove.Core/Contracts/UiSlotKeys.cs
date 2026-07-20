namespace Cove.Core.Contracts;

/// <summary>
/// Catalog of host-defined UI slot keys. A slot is a named injection point rendered by a host page
/// into which extensions contribute components (see <c>UISlotContribution.Slot</c>). The set is open
/// — host pages may declare new slots and extensions may target their own — so this is a
/// <c>const string</c> catalog of the well-known host slots rather than a closed enum. Members are
/// authored in stable alphabetical order to keep downstream code generation deterministic.
/// </summary>
public static class UiSlotKeys
{
    public const string GalleryDetailActions = "gallery-detail-actions";
    public const string GalleryDetailBottom = "gallery-detail-bottom";
    public const string GalleryDetailMainBottom = "gallery-detail-main-bottom";
    public const string GroupDetailActions = "group-detail-actions";
    public const string GroupDetailBottom = "group-detail-bottom";
    public const string GroupDetailMainBottom = "group-detail-main-bottom";
    public const string GroupDetailSidebarBottom = "group-detail-sidebar-bottom";
    public const string ImageDetailActions = "image-detail-actions";
    public const string ImageDetailMainBottom = "image-detail-main-bottom";
    public const string ImageDetailSidebarBottom = "image-detail-sidebar-bottom";
    public const string ListPageToolbarEnd = "list-page-toolbar-end";
    public const string PerformerDetailActions = "performer-detail-actions";
    public const string PerformerDetailBottom = "performer-detail-bottom";
    public const string StudioCardFooter = "studio-card-footer";
    public const string StudioDetailActions = "studio-detail-actions";
    public const string StudioDetailBottom = "studio-detail-bottom";
    public const string StudioDetailSidebarBottom = "studio-detail-sidebar-bottom";
    public const string TagCardFooter = "tag-card-footer";
    public const string TagDetailActions = "tag-detail-actions";
    public const string TagDetailBottom = "tag-detail-bottom";
    public const string TagDetailSidebarBottom = "tag-detail-sidebar-bottom";
    public const string VideoDetailActions = "video-detail-actions";
    public const string VideoDetailMainBottom = "video-detail-main-bottom";

    /// <summary>All well-known host slot keys, in stable order.</summary>
    public static readonly string[] All =
    [
        GalleryDetailActions, GalleryDetailBottom, GalleryDetailMainBottom,
        GroupDetailActions, GroupDetailBottom, GroupDetailMainBottom, GroupDetailSidebarBottom,
        ImageDetailActions, ImageDetailMainBottom, ImageDetailSidebarBottom,
        ListPageToolbarEnd,
        PerformerDetailActions, PerformerDetailBottom,
        StudioCardFooter, StudioDetailActions, StudioDetailBottom, StudioDetailSidebarBottom,
        TagCardFooter, TagDetailActions, TagDetailBottom, TagDetailSidebarBottom,
        VideoDetailActions, VideoDetailMainBottom,
    ];
}
