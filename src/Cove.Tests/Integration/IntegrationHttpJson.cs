using System.Net.Http.Json;
using System.Text.Json;
using Cove.Core.Common;

namespace Cove.Tests.Integration;

internal static class IntegrationHttpJson
{
    // Read integration responses through the real canonical options so tests assert against the
    // actual wire contract and would catch any drift in CoveJson.Default.
    public static readonly JsonSerializerOptions Options = CoveJson.Default;

    public static Task<T?> ReadApiJsonAsync<T>(this HttpContent content, CancellationToken cancellationToken = default)
        => content.ReadFromJsonAsync<T>(Options, cancellationToken);
}
