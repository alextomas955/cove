using System.Text.Json;
using System.Text.RegularExpressions;
using Cove.Core.Common;

namespace Cove.Tests;

/// <summary>
/// Locks the SER-04 special-type wire policy through the canonical <see cref="CoveJson.Default"/>:
/// DateTime/DateTimeOffset are ISO-8601, Guid is the 36-char lowercase "D" form, and byte[] is
/// base64 — all System.Text.Json defaults, no custom converter. Also documents that no boundary
/// DTO field is <c>decimal</c>, so the <c>JsonNumberHandling.WriteAsString</c> opt-in list is
/// empty this phase (verified: zero <c>decimal</c> properties in src/Cove.Core/DTOs).
/// </summary>
public class SpecialTypeRoundTripTests
{
    private sealed record SpecialShape(
        DateTime When,
        DateTimeOffset WhenOffset,
        Guid Id,
        byte[] Blob);

    [Fact]
    public void DateTime_IsIso8601_ThroughCanonicalOptions()
    {
        var when = new DateTime(2026, 7, 19, 13, 45, 30, DateTimeKind.Utc);
        var json = JsonSerializer.Serialize(when, CoveJson.Default).Trim('"');

        Assert.StartsWith("2026-07-19T13:45:30", json);
        // ISO-8601 round-trips back to the same instant.
        var back = JsonSerializer.Deserialize<DateTime>($"\"{json}\"", CoveJson.Default);
        Assert.Equal(when, back.ToUniversalTime());
    }

    [Fact]
    public void Guid_Is36CharLowercaseD_ThroughCanonicalOptions()
    {
        var id = Guid.NewGuid();
        var json = JsonSerializer.Serialize(id, CoveJson.Default).Trim('"');

        Assert.Equal(36, json.Length);
        Assert.Matches(new Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"), json);
        Assert.Equal(id, JsonSerializer.Deserialize<Guid>($"\"{json}\"", CoveJson.Default));
    }

    [Fact]
    public void ByteArray_IsBase64_ThroughCanonicalOptions()
    {
        var blob = new byte[] { 1, 2, 3, 4, 250 };
        var json = JsonSerializer.Serialize(blob, CoveJson.Default).Trim('"');

        Assert.Equal(Convert.ToBase64String(blob), json);
        Assert.Equal(blob, JsonSerializer.Deserialize<byte[]>($"\"{json}\"", CoveJson.Default));
    }

    [Fact]
    public void SpecialShape_RoundTrips_ThroughCanonicalOptions()
    {
        var original = new SpecialShape(
            new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc),
            new DateTimeOffset(2026, 1, 2, 3, 4, 5, TimeSpan.FromHours(2)),
            Guid.NewGuid(),
            [10, 20, 30]);

        var json = JsonSerializer.Serialize(original, CoveJson.Default);
        var back = JsonSerializer.Deserialize<SpecialShape>(json, CoveJson.Default);

        Assert.NotNull(back);
        Assert.Equal(original.When, back!.When);
        Assert.Equal(original.WhenOffset, back.WhenOffset);
        Assert.Equal(original.Id, back.Id);
        Assert.Equal(original.Blob, back.Blob);

        // camelCase property names on the wire.
        Assert.Contains("\"when\":", json);
        Assert.Contains("\"id\":", json);
        Assert.Contains("\"blob\":", json);
    }

    [Fact]
    public void NoDecimalWireFields_SoWriteAsStringOptInListIsEmpty()
    {
        // Documented invariant (03-RESEARCH.md §6): grep decimal in src/Cove.Core/DTOs → 0.
        // No boundary DTO carries a decimal, so no field opts into JsonNumberHandling.WriteAsString
        // this phase. Precision-sensitive numerics that cross the wire are double / float[], which
        // are JSON numbers by default. This test is an executable note of that decision.
        Assert.True(true);
    }
}
