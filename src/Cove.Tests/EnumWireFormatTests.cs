using System.Text.Json;
using Cove.Core.Auth;
using Cove.Core.Common;
using Cove.Core.DTOs;
using Cove.Core.Entities;
using Cove.Core.Enums;
using Cove.Core.Events;
using Cove.Core.Interfaces;

namespace Cove.Tests;

/// <summary>
/// Locks the SER-01 wire contract: every Cove.Core enum serializes through the canonical
/// <see cref="CoveJson.Default"/> as a camelCase named string, reads leniently from both the
/// string and the underlying integer, and — critically — an enum on an UNREGISTERED type
/// (reflection-fallback path) still emits a camelCase string, proving the global converter,
/// not just the source-gen fast path, governs the enum policy.
/// </summary>
public class EnumWireFormatTests
{
    // The full SER-01 surface: all 27 Cove.Core enums (03-RESEARCH.md §4).
    public static readonly Type[] AllCoreEnums =
    [
        typeof(GenderEnum), typeof(CircumcisedEnum), typeof(FilterMode), typeof(SortDirection),
        typeof(CriterionModifier), typeof(EventType), typeof(BulkUpdateMode), typeof(PrincipalKind),
        typeof(PermissionMode), typeof(RatingSystemType), typeof(RatingStarPrecision),
        typeof(FaceAppearanceHostType), typeof(RatingHostType), typeof(InteractionHostType),
        typeof(InteractionKind), typeof(AffinityHostType), typeof(SegmentHostType),
        typeof(DetectionHostType), typeof(EmbeddingHostType), typeof(EmbeddingModality),
        typeof(PlaybackSessionState), typeof(AiRunTargetType), typeof(AiRunStatus),
        typeof(JobStatus), typeof(JobUnitOutcome), typeof(GroupKind), typeof(GroupItemKind),
    ];

    [Fact]
    public void AllCoreEnums_CountIs27()
    {
        Assert.Equal(27, AllCoreEnums.Length);
        Assert.Equal(27, AllCoreEnums.Distinct().Count());
    }

    public static IEnumerable<object[]> EnumMembers()
    {
        foreach (var enumType in AllCoreEnums)
            foreach (var value in Enum.GetValues(enumType))
                yield return [enumType, value!];
    }

    [Theory]
    [MemberData(nameof(EnumMembers))]
    public void EveryEnumMember_SerializesToCamelCaseString(Type enumType, object value)
    {
        var json = JsonSerializer.Serialize(value, enumType, CoveJson.Default);

        // Must be a quoted string, never a bare integer.
        Assert.StartsWith("\"", json);
        Assert.EndsWith("\"", json);

        var actual = json.Trim('"');
        var expected = ExpectedWireName(enumType, value);
        Assert.Equal(expected, actual);

        // First character is lowercase — proves camelCase, not PascalCase or integer.
        Assert.True(char.IsLower(actual[0]), $"{enumType.Name}.{value} wire form '{actual}' is not camelCase");
    }

    [Theory]
    [MemberData(nameof(EnumMembers))]
    public void EveryEnumMember_ReadsFromBothStringAndInteger(Type enumType, object value)
    {
        var wireName = ExpectedWireName(enumType, value);
        var underlying = Convert.ToInt64(value);

        var fromString = JsonSerializer.Deserialize($"\"{wireName}\"", enumType, CoveJson.Default);
        var fromInteger = JsonSerializer.Deserialize(underlying.ToString(), enumType, CoveJson.Default);

        Assert.Equal(value, fromString);
        Assert.Equal(value, fromInteger);
    }

    // Pinned literals: asserting the exact hardcoded wire string proves the
    // [JsonStringEnumMemberName] pins are effective (decoupled from the C# identifier).
    [Theory]
    [InlineData(typeof(GenderEnum), (int)GenderEnum.NonBinary, "nonBinary")]
    [InlineData(typeof(GenderEnum), (int)GenderEnum.TransgenderMale, "transgenderMale")]
    [InlineData(typeof(CircumcisedEnum), (int)CircumcisedEnum.Uncut, "uncut")]
    [InlineData(typeof(JobStatus), (int)JobStatus.Completed, "completed")]
    [InlineData(typeof(JobUnitOutcome), (int)JobUnitOutcome.Succeeded, "succeeded")]
    [InlineData(typeof(EventType), (int)EventType.VideoCreated, "videoCreated")]
    [InlineData(typeof(EventType), (int)EventType.ServerStopping, "serverStopping")]
    public void PinnedEnumMembers_KeepTheirWireName(Type enumType, int value, string expected)
    {
        var boxed = Enum.ToObject(enumType, value);
        var json = JsonSerializer.Serialize(boxed, enumType, CoveJson.Default);
        Assert.Equal($"\"{expected}\"", json);
    }

    [Fact]
    public void UnregisteredEnum_SerializesToCamelCaseString_ViaReflectionFallback()
    {
        // UnregisteredEnumHolder is NOT reachable from any [JsonSerializable] root in
        // CoveJsonContext, so it resolves through the reflection fallback. The enum field must
        // still be a camelCase STRING, proving the GLOBAL JsonStringEnumConverter — not the
        // source-gen UseStringEnumConverter fast path — governs every extension-ALC and
        // unregistered host DTO enum. Without the global converter this would be an integer.
        var holder = new UnregisteredEnumHolder(GenderEnum.NonBinary);
        var json = JsonSerializer.Serialize(holder, CoveJson.Default);

        Assert.Contains("\"value\":\"nonBinary\"", json);
        Assert.DoesNotContain("\"value\":5", json);
    }

    [Fact]
    public void CriterionModifier_CamelCaseParity_ThroughCanonicalOptions()
    {
        // Byte-identical to the pre-canonical bespoke options output.
        var expected = new Dictionary<CriterionModifier, string>
        {
            [CriterionModifier.Equals] = "equals",
            [CriterionModifier.NotEquals] = "notEquals",
            [CriterionModifier.GreaterThan] = "greaterThan",
            [CriterionModifier.LessThan] = "lessThan",
            [CriterionModifier.Includes] = "includes",
            [CriterionModifier.Excludes] = "excludes",
            [CriterionModifier.IncludesAll] = "includesAll",
            [CriterionModifier.ExcludesAll] = "excludesAll",
            [CriterionModifier.IsNull] = "isNull",
            [CriterionModifier.NotNull] = "notNull",
            [CriterionModifier.Between] = "between",
            [CriterionModifier.NotBetween] = "notBetween",
            [CriterionModifier.MatchesRegex] = "matchesRegex",
            [CriterionModifier.NotMatchesRegex] = "notMatchesRegex",
        };

        foreach (var (modifier, wire) in expected)
            Assert.Equal($"\"{wire}\"", JsonSerializer.Serialize(modifier, CoveJson.Default));
    }

    [Theory]
    [InlineData("\"greater_than\"", CriterionModifier.GreaterThan)]
    [InlineData("\"GREATER_THAN\"", CriterionModifier.GreaterThan)]
    [InlineData("\"includesAll\"", CriterionModifier.IncludesAll)]
    [InlineData("6", CriterionModifier.IncludesAll)]
    public void CriterionModifier_LenientRead_ThroughCanonicalOptions(string json, CriterionModifier expected)
    {
        var actual = JsonSerializer.Deserialize<CriterionModifier>(json, CoveJson.Default);
        Assert.Equal(expected, actual);
    }

    // Resolves the expected wire name: honors any [JsonStringEnumMemberName] pin, otherwise the
    // default camelCase policy — the same rule the global converter applies.
    private static string ExpectedWireName(Type enumType, object value)
    {
        var member = enumType.GetMember(value.ToString()!);
        var pin = member.Length > 0
            ? member[0]
                .GetCustomAttributes(typeof(System.Text.Json.Serialization.JsonStringEnumMemberNameAttribute), false)
                .Cast<System.Text.Json.Serialization.JsonStringEnumMemberNameAttribute>()
                .FirstOrDefault()
            : null;

        return pin?.Name ?? JsonNamingPolicy.CamelCase.ConvertName(value.ToString()!);
    }

    // NOT registered in CoveJsonContext — deliberately exercises the reflection fallback.
    private sealed record UnregisteredEnumHolder(GenderEnum Value);
}
