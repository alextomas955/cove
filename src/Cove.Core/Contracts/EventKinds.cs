using System.Text.Json.Serialization;

namespace Cove.Core.Contracts;

/// <summary>
/// Closed host-owned set of extension event kinds — the dotted tokens dispatched to
/// <c>IEventExtension</c> consumers (e.g. <c>"video.created"</c>). Pinned wire names are public API:
/// the two live extensions match on these strings, so the serialized token must never change.
///
/// Each member carries <see cref="JsonStringEnumMemberName"/> so serializing through the canonical
/// <c>CoveJson.Default</c> options emits the byte-identical dotted string the host has always
/// produced. This is the drift-free bridge that lets host producers migrate off magic strings onto
/// this enum with no wire break. Members are authored in stable alphabetical order (by wire token)
/// to keep downstream code generation deterministic.
/// </summary>
public enum EventKinds
{
    [JsonStringEnumMemberName("gallery.created")] GalleryCreated,
    [JsonStringEnumMemberName("gallery.deleted")] GalleryDeleted,
    [JsonStringEnumMemberName("gallery.updated")] GalleryUpdated,
    [JsonStringEnumMemberName("group.created")] GroupCreated,
    [JsonStringEnumMemberName("group.deleted")] GroupDeleted,
    [JsonStringEnumMemberName("group.updated")] GroupUpdated,
    [JsonStringEnumMemberName("image.created")] ImageCreated,
    [JsonStringEnumMemberName("image.deleted")] ImageDeleted,
    [JsonStringEnumMemberName("image.updated")] ImageUpdated,
    [JsonStringEnumMemberName("performer.created")] PerformerCreated,
    [JsonStringEnumMemberName("performer.deleted")] PerformerDeleted,
    [JsonStringEnumMemberName("performer.updated")] PerformerUpdated,
    [JsonStringEnumMemberName("rating.created")] RatingCreated,
    [JsonStringEnumMemberName("rating.deleted")] RatingDeleted,
    [JsonStringEnumMemberName("rating.updated")] RatingUpdated,
    [JsonStringEnumMemberName("scan.completed")] ScanCompleted,
    [JsonStringEnumMemberName("scan.started")] ScanStarted,
    [JsonStringEnumMemberName("studio.created")] StudioCreated,
    [JsonStringEnumMemberName("studio.deleted")] StudioDeleted,
    [JsonStringEnumMemberName("studio.updated")] StudioUpdated,
    [JsonStringEnumMemberName("tag.created")] TagCreated,
    [JsonStringEnumMemberName("tag.deleted")] TagDeleted,
    [JsonStringEnumMemberName("tag.merged")] TagMerged,
    [JsonStringEnumMemberName("tag.updated")] TagUpdated,
    [JsonStringEnumMemberName("video.created")] VideoCreated,
    [JsonStringEnumMemberName("video.deleted")] VideoDeleted,
    [JsonStringEnumMemberName("video.updated")] VideoUpdated,
}

/// <summary>
/// Const-string companion to <see cref="EventKinds"/>. Host producers that need the dotted token as a
/// plain string — without routing through JSON serialization — reference these constants. Values are
/// byte-identical to the corresponding <see cref="JsonStringEnumMemberName"/> wire tokens.
/// </summary>
public static class EventKindStrings
{
    public const string GalleryCreated = "gallery.created";
    public const string GalleryDeleted = "gallery.deleted";
    public const string GalleryUpdated = "gallery.updated";
    public const string GroupCreated = "group.created";
    public const string GroupDeleted = "group.deleted";
    public const string GroupUpdated = "group.updated";
    public const string ImageCreated = "image.created";
    public const string ImageDeleted = "image.deleted";
    public const string ImageUpdated = "image.updated";
    public const string PerformerCreated = "performer.created";
    public const string PerformerDeleted = "performer.deleted";
    public const string PerformerUpdated = "performer.updated";
    public const string RatingCreated = "rating.created";
    public const string RatingDeleted = "rating.deleted";
    public const string RatingUpdated = "rating.updated";
    public const string ScanCompleted = "scan.completed";
    public const string ScanStarted = "scan.started";
    public const string StudioCreated = "studio.created";
    public const string StudioDeleted = "studio.deleted";
    public const string StudioUpdated = "studio.updated";
    public const string TagCreated = "tag.created";
    public const string TagDeleted = "tag.deleted";
    public const string TagMerged = "tag.merged";
    public const string TagUpdated = "tag.updated";
    public const string VideoCreated = "video.created";
    public const string VideoDeleted = "video.deleted";
    public const string VideoUpdated = "video.updated";
}

/// <summary>Helpers for mapping <see cref="EventKinds"/> members to their canonical wire token.</summary>
public static class EventKindExtensions
{
    /// <summary>
    /// The canonical dotted wire token for an <see cref="EventKinds"/> member — identical to what the
    /// canonical serializer emits, resolved without JSON serialization.
    /// </summary>
    public static string ToWireString(this EventKinds kind) => kind switch
    {
        EventKinds.GalleryCreated => EventKindStrings.GalleryCreated,
        EventKinds.GalleryDeleted => EventKindStrings.GalleryDeleted,
        EventKinds.GalleryUpdated => EventKindStrings.GalleryUpdated,
        EventKinds.GroupCreated => EventKindStrings.GroupCreated,
        EventKinds.GroupDeleted => EventKindStrings.GroupDeleted,
        EventKinds.GroupUpdated => EventKindStrings.GroupUpdated,
        EventKinds.ImageCreated => EventKindStrings.ImageCreated,
        EventKinds.ImageDeleted => EventKindStrings.ImageDeleted,
        EventKinds.ImageUpdated => EventKindStrings.ImageUpdated,
        EventKinds.PerformerCreated => EventKindStrings.PerformerCreated,
        EventKinds.PerformerDeleted => EventKindStrings.PerformerDeleted,
        EventKinds.PerformerUpdated => EventKindStrings.PerformerUpdated,
        EventKinds.RatingCreated => EventKindStrings.RatingCreated,
        EventKinds.RatingDeleted => EventKindStrings.RatingDeleted,
        EventKinds.RatingUpdated => EventKindStrings.RatingUpdated,
        EventKinds.ScanCompleted => EventKindStrings.ScanCompleted,
        EventKinds.ScanStarted => EventKindStrings.ScanStarted,
        EventKinds.StudioCreated => EventKindStrings.StudioCreated,
        EventKinds.StudioDeleted => EventKindStrings.StudioDeleted,
        EventKinds.StudioUpdated => EventKindStrings.StudioUpdated,
        EventKinds.TagCreated => EventKindStrings.TagCreated,
        EventKinds.TagDeleted => EventKindStrings.TagDeleted,
        EventKinds.TagMerged => EventKindStrings.TagMerged,
        EventKinds.TagUpdated => EventKindStrings.TagUpdated,
        EventKinds.VideoCreated => EventKindStrings.VideoCreated,
        EventKinds.VideoDeleted => EventKindStrings.VideoDeleted,
        EventKinds.VideoUpdated => EventKindStrings.VideoUpdated,
        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown event kind."),
    };
}
