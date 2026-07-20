using System.Collections.Concurrent;
using Microsoft.OpenApi;

namespace Cove.Api.OpenApi;

/// <summary>
/// Shared channel between <see cref="ContractSchemaTransformer"/> and
/// <see cref="RequestSchemaRelaxationTransformer"/>. The schema transformer has the CLR metadata
/// needed to tell a genuinely-required request input (a non-nullable, no-default constructor
/// parameter such as a create's name or an id list) from a member the caller may omit (a value-type
/// flag, or a settable property whose initializer supplies a server-side default). It records the
/// former set here, keyed by the schema instance; the document transformer, which alone knows whether
/// a schema is used only as a request body, reads it back to relax the rest.
/// </summary>
internal sealed class RequestRequiredMembers
{
    private readonly ConcurrentDictionary<OpenApiSchema, IReadOnlySet<string>> _bySchema =
        new(ReferenceEqualityComparer.Instance);

    public void Record(OpenApiSchema schema, IReadOnlySet<string> inputRequired) =>
        _bySchema[schema] = inputRequired;

    public bool TryGet(OpenApiSchema schema, out IReadOnlySet<string> inputRequired) =>
        _bySchema.TryGetValue(schema, out inputRequired!);
}
