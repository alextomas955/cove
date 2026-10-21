using System.Text.Json;
using Cove.Core.DTOs;

namespace Cove.Tests;

// #703: a caller that does not say otherwise skips videos with several passing candidates, rather than
// applying the top-ranked guess.
public class IdentifyOptionsDtoTests
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    [Fact]
    public void SkipMultipleMatches_DefaultsToOn()
    {
        Assert.True(new IdentifyOptionsDto().SkipMultipleMatches);
        Assert.True(JsonSerializer.Deserialize<IdentifyOptionsDto>("{}", Options)!.SkipMultipleMatches);
    }

    [Fact]
    public void SkipMultipleMatches_CanBeTurnedOff()
    {
        var options = JsonSerializer.Deserialize<IdentifyOptionsDto>("""{"skipMultipleMatches":false}""", Options)!;
        Assert.False(options.SkipMultipleMatches);
    }
}
