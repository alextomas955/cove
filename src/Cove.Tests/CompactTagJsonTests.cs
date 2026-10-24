using System.Text.Json;
using Cove.Api.Http;
using Cove.Core.DTOs;

namespace Cove.Tests;

public sealed class CompactTagJsonTests
{
    private static JsonElement Serialize(TagDto tag)
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        CompactTagJson.Apply(options);
        return JsonSerializer.SerializeToElement(tag, options);
    }

    private static string[] Keys(JsonElement element) => element.EnumerateObject().Select(property => property.Name).Order().ToArray();

    [Fact]
    public void LeavesOutUnsetFieldsAndWritesTheRest()
    {
        var json = Serialize(new TagDto(7, "Outdoor", null, false, []));

        Assert.Equal(["aliases", "canRemove", "canReportIncorrect", "favorite", "hasImage", "id", "isDerived", "name", "organized"], Keys(json));
        Assert.Equal(0, json.GetProperty("aliases").GetArrayLength());
        Assert.False(json.GetProperty("favorite").GetBoolean());
    }

    [Fact]
    public void WritesSetFields()
    {
        var json = Serialize(new TagDto(7, "Outdoor", "Taken outside", true, ["outside"], Color: "#00ff00") { SortName = "outdoor" });

        Assert.Equal("Taken outside", json.GetProperty("description").GetString());
        Assert.Equal("#00ff00", json.GetProperty("color").GetString());
        Assert.Equal("outdoor", json.GetProperty("sortName").GetString());
        Assert.False(json.TryGetProperty("provenance", out _));
    }

    [Fact]
    public void LeavesOtherTypesAsTheyWere()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        CompactTagJson.Apply(options);

        var json = JsonSerializer.SerializeToElement(new TagProvenanceDto("user", null, null, null, "2026-01-01"), options);

        Assert.Equal(JsonValueKind.Null, json.GetProperty("sourceRunId").ValueKind);
    }
}
