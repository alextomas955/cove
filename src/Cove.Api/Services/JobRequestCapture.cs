using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

namespace Cove.Api.Services;

/// <summary>The API request that started a job, which is everything needed to start it again.</summary>
public sealed record JobReplayRequest(string Method, string Path, string? Body);

/// <summary>
/// Remembers the API request that started each job so the job can be retried by sending that request
/// again. Jobs need no changes for this: every job started while an API request is being handled is tied
/// to that request.
/// </summary>
public sealed partial class JobRequestCapture(IHttpContextAccessor httpContextAccessor)
{
    private const string ItemKey = "cove.job-request";

    /// <summary>Bodies larger than this are not kept, and the jobs they start cannot be retried.</summary>
    internal const int MaxBodyLength = 512 * 1024;

    /// <summary>The longest path and query string the job history can hold.</summary>
    private const int MaxPathLength = 2048;

    private static readonly AsyncLocal<bool> InsideJobWork = new();

    /// <summary>
    /// Marks the current async flow as a job's own work. A job started from inside another job (a scan
    /// queued when a download batch finishes, say) is not a repeat of the request that started the first
    /// one, so it is not tied to it.
    /// </summary>
    public static void MarkJobWork() => InsideJobWork.Value = true;

    /// <summary>
    /// Reads and keeps the body of an API request that may start a job. Runs as middleware, before the
    /// endpoint reads the body, and leaves the body readable for it.
    /// </summary>
    public static async Task CaptureAsync(HttpContext context)
    {
        var request = context.Request;
        if (!request.Path.StartsWithSegments("/api") || !IsMutating(request.Method))
            return;

        var path = request.Path.Value + request.QueryString.Value;
        if (path.Length > MaxPathLength)
            return;

        if (request.ContentLength is 0 || context.Features.Get<IHttpRequestBodyDetectionFeature>()?.CanHaveBody == false)
        {
            context.Items[ItemKey] = new JobReplayRequest(request.Method, path, null);
            return;
        }

        // Only JSON bodies can be sent again as they were; an upload, say, cannot.
        if (!IsJson(request.ContentType) || request.ContentLength > MaxBodyLength)
            return;

        request.EnableBuffering();
        var body = new StringBuilder();
        var chunk = new char[8192];
        using (var reader = new StreamReader(request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true))
        {
            int read;
            while ((read = await reader.ReadAsync(chunk, context.RequestAborted)) > 0)
            {
                if (body.Length + read > MaxBodyLength)
                {
                    request.Body.Position = 0;
                    return;
                }

                body.Append(chunk, 0, read);
            }
        }
        request.Body.Position = 0;

        context.Items[ItemKey] = new JobReplayRequest(request.Method, path, body.Length == 0 ? null : body.ToString());
    }

    /// <summary>
    /// The request that is starting a job right now, or null when the job cannot be retried: it is not
    /// being started by an API request, it is being started by another job, or its request carries a
    /// secret (a password or key) that must not be stored.
    /// </summary>
    public JobReplayRequest? ForNewJob()
    {
        if (InsideJobWork.Value)
            return null;

        var context = httpContextAccessor.HttpContext;
        if (context?.Items[ItemKey] is not JobReplayRequest request)
            return null;

        return CarriesSecret(request) ? null : request;
    }

    private static bool IsMutating(string method) =>
        HttpMethods.IsPost(method) || HttpMethods.IsPut(method) || HttpMethods.IsPatch(method) || HttpMethods.IsDelete(method);

    private static bool IsJson(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
            return false;

        var mediaType = contentType.Split(';', 2)[0].Trim();
        return mediaType.Equals("application/json", StringComparison.OrdinalIgnoreCase)
            || mediaType.EndsWith("+json", StringComparison.OrdinalIgnoreCase);
    }

    internal static bool CarriesSecret(JobReplayRequest request)
    {
        var queryStart = request.Path.IndexOf('?');
        if (queryStart >= 0)
        {
            foreach (var pair in request.Path[(queryStart + 1)..].Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                if (SecretName().IsMatch(Uri.UnescapeDataString(pair.Split('=', 2)[0])))
                    return true;
            }
        }

        if (request.Body is null)
            return false;

        try
        {
            using var document = JsonDocument.Parse(request.Body);
            return HasSecretProperty(document.RootElement);
        }
        catch (JsonException)
        {
            // A body that is not JSON cannot be checked, so it is not kept.
            return true;
        }
    }

    private static bool HasSecretProperty(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Object => element.EnumerateObject().Any(property => SecretName().IsMatch(property.Name) || HasSecretProperty(property.Value)),
        JsonValueKind.Array => element.EnumerateArray().Any(HasSecretProperty),
        _ => false,
    };

    [GeneratedRegex("password|passwd|secret|token|api[-_]?key|credential|cookie", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex SecretName();
}
