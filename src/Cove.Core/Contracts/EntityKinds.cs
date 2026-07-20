namespace Cove.Core.Contracts;

/// <summary>
/// Canonical catalog of entity-kind tokens. These are the lowercase discriminators used across the
/// wire contract — the value the event bridge stamps on an <c>ExtensionEvent.EntityType</c>, the
/// <c>EntityType</c> union published to extension authors, and the entity discriminators carried by
/// UI contributions and actions. Open by nature (extensions may introduce their own entities), so
/// this is a <c>const string</c> catalog rather than a closed enum. Members are authored in stable
/// alphabetical order to keep downstream code generation deterministic.
/// </summary>
public static class EntityKinds
{
    public const string Audio = "audio";
    public const string Face = "face";
    public const string Gallery = "gallery";
    public const string Group = "group";
    public const string Image = "image";
    public const string Performer = "performer";
    public const string Segment = "segment";
    public const string Studio = "studio";
    public const string Tag = "tag";
    public const string Text = "text";
    public const string Video = "video";

    /// <summary>All host-defined entity-kind tokens, in stable order.</summary>
    public static readonly string[] All =
    [
        Audio, Face, Gallery, Group, Image, Performer, Segment, Studio, Tag, Text, Video,
    ];
}
