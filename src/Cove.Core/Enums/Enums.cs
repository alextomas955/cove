using System.Text.Json.Serialization;

namespace Cove.Core.Enums;

// Wire names below are public API (external/consumer-visible values); pin them so a future
// C# rename cannot change the serialized string.
public enum GenderEnum
{
    [JsonStringEnumMemberName("male")] Male,
    [JsonStringEnumMemberName("female")] Female,
    [JsonStringEnumMemberName("transgenderMale")] TransgenderMale,
    [JsonStringEnumMemberName("transgenderFemale")] TransgenderFemale,
    [JsonStringEnumMemberName("intersex")] Intersex,
    [JsonStringEnumMemberName("nonBinary")] NonBinary
}

public enum CircumcisedEnum
{
    [JsonStringEnumMemberName("cut")] Cut,
    [JsonStringEnumMemberName("uncut")] Uncut
}

// FilterMode persists as its integer value in saved_filters."Mode"; that stored integer is
// independent of the camelCase string wire form. Members remain append-only so existing rows'
// modes stay stable.
public enum FilterMode
{
    Videos,
    Performers,
    Studios,
    Galleries,
    Groups,
    Tags,
    Images,
    // Appended only — Mode persists as the enum's integer value (saved_filters."Mode"), so new entries
    // must go at the end to keep existing rows' modes stable.
    Audios,
    Faces,
    Texts,
    Segments,
    RawSegments
}

public enum SortDirection
{
    Asc,
    Desc
}
