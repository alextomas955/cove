using System.Text.Json;
using Cove.Core.Common;
using Cove.Core.Contracts;

namespace Cove.Tests.Contracts;

/// <summary>
/// Proves the <see cref="EventKinds"/> enum is a byte-identical, drift-free replacement for the dotted
/// magic strings host producers emit today. Serializing every member through the canonical
/// <see cref="CoveJson.Default"/> options must yield exactly the legacy dotted token, round-trip back
/// to the same member, and the enum's full wire-token set must equal the legacy literal set with no
/// missing member and no orphan — so migrating host producers onto this enum cannot silently change
/// the wire contract the two live extensions consume. Doubles as the permanent regression guard.
/// </summary>
public class ContractRegistryTests
{
    /// <summary>
    /// The legacy dotted event tokens, copied verbatim from the explicit switch arms of
    /// <c>ExtensionEventBridge.MapEventType</c>. This is the independent oracle the registry is proven
    /// against — it is intentionally NOT derived from <see cref="EventKinds"/>.
    /// </summary>
    public static readonly string[] LegacyMapEventTypeLiterals =
    [
        "video.created", "video.updated", "video.deleted",
        "performer.created", "performer.updated", "performer.deleted",
        "tag.created", "tag.updated", "tag.deleted", "tag.merged",
        "studio.created", "studio.updated", "studio.deleted",
        "gallery.created", "gallery.updated", "gallery.deleted",
        "image.created", "image.updated", "image.deleted",
        "group.created", "group.updated", "group.deleted",
        "rating.created", "rating.updated", "rating.deleted",
        "scan.started", "scan.completed",
    ];

    private static string SerializeToken(EventKinds kind) =>
        JsonSerializer.Serialize(kind, CoveJson.Default).Trim('"');

    public static IEnumerable<object[]> AllEventKinds() =>
        Enum.GetValues<EventKinds>().Select(k => new object[] { k });

    [Theory]
    [MemberData(nameof(AllEventKinds))]
    public void EventKind_SerializesToLegacyDottedToken(EventKinds kind)
    {
        var wire = SerializeToken(kind);

        // Byte-identical to the corresponding legacy literal, and to the string companion + helper.
        Assert.Contains(wire, LegacyMapEventTypeLiterals);
        Assert.Equal(kind.ToWireString(), wire);
    }

    [Theory]
    [MemberData(nameof(AllEventKinds))]
    public void EventKind_RoundTripsThroughCanonicalOptions(EventKinds kind)
    {
        var wire = SerializeToken(kind);
        var back = JsonSerializer.Deserialize<EventKinds>($"\"{wire}\"", CoveJson.Default);
        Assert.Equal(kind, back);
    }

    [Fact]
    public void EveryLegacyLiteral_DeserializesToAnEventKind()
    {
        foreach (var literal in LegacyMapEventTypeLiterals)
        {
            var kind = JsonSerializer.Deserialize<EventKinds>($"\"{literal}\"", CoveJson.Default);
            Assert.Equal(literal, kind.ToWireString());
        }
    }

    [Fact]
    public void EventKindWireTokens_EqualLegacyLiteralSet_NoDriftNoOrphans()
    {
        var registryTokens = Enum.GetValues<EventKinds>()
            .Select(SerializeToken)
            .ToHashSet();
        var legacyTokens = LegacyMapEventTypeLiterals.ToHashSet();

        // Full set-equality: no legacy literal missing a member, no member without a legacy literal.
        Assert.Empty(legacyTokens.Except(registryTokens));
        Assert.Empty(registryTokens.Except(legacyTokens));
        Assert.Equal(legacyTokens.Count, registryTokens.Count);
        Assert.Equal(LegacyMapEventTypeLiterals.Length, Enum.GetValues<EventKinds>().Length);
    }

    [Fact]
    public void EntityKinds_MatchLowercasedBridgeTokens()
    {
        // The bridge stamps EntityType via evt.EntityType.ToLowerInvariant(); the catalog must match.
        foreach (var kind in EntityKinds.All)
        {
            Assert.Equal(kind.ToLowerInvariant(), kind);
        }

        // The core entity discriminators the event/UI contracts reference are all present.
        string[] expected =
        [
            "video", "performer", "studio", "tag", "gallery", "image",
            "group", "audio", "text", "face", "segment",
        ];
        Assert.Empty(expected.Except(EntityKinds.All));
        Assert.Empty(EntityKinds.All.Except(expected));
    }
}
