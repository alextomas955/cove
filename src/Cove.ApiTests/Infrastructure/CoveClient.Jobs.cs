using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cove.Core.Interfaces;

namespace Cove.ApiTests.Infrastructure;

public sealed partial class CoveClient
{
    public Task<IReadOnlyList<JobInfo>> GetJobsAsync(
        CancellationToken cancellationToken = default)
        => SendAsync<IReadOnlyList<JobInfo>>(
            HttpMethod.Get,
            WithCacheNonce("/api/jobs"),
            payload: null,
            cancellationToken);

    public Task<IReadOnlyList<JobInfo>> GetJobHistoryAsync(
        CancellationToken cancellationToken = default)
        => SendAsync<IReadOnlyList<JobInfo>>(
            HttpMethod.Get,
            WithCacheNonce("/api/jobs/history"),
            payload: null,
            cancellationToken);

    public Task<string> StartLibraryScanJobAsync(CancellationToken cancellationToken = default)
        => StartJobAsync("/api/jobs/scan", cancellationToken);

    public Task<string> StartThumbnailGenerationJobAsync(CancellationToken cancellationToken = default)
        => StartJobAsync("/api/jobs/generate-thumbnails", cancellationToken);

    public Task<string> StartVideoPhashGenerationJobAsync(CancellationToken cancellationToken = default)
        => StartJobAsync("/api/jobs/generate-video-phashes", cancellationToken);

    public Task<string> StartImagePhashGenerationJobAsync(CancellationToken cancellationToken = default)
        => StartJobAsync("/api/jobs/generate-image-phashes", cancellationToken);

    public Task<string> StartLibraryCleanJobAsync(
        bool dryRun,
        CancellationToken cancellationToken = default)
        => StartJobAsync($"/api/jobs/clean?dryRun={dryRun.ToString().ToLowerInvariant()}", cancellationToken);

    public Task CancelJobAsync(
        string jobId,
        CancellationToken cancellationToken = default)
        => SendJobControlAsync(
            HttpMethod.Delete,
            $"/api/jobs/{Uri.EscapeDataString(jobId)}",
            payload: null,
            cancellationToken);

    public Task ReorderJobAsync(
        string jobId,
        string? beforeJobId,
        CancellationToken cancellationToken = default)
        => SendJobControlAsync(
            HttpMethod.Put,
            $"/api/jobs/{Uri.EscapeDataString(jobId)}/reorder",
            new { BeforeJobId = beforeJobId },
            cancellationToken);

    public Task<JsonElement> GetJobHistoryJsonAsync(CancellationToken cancellationToken = default)
        => SendAsync<JsonElement>(
            HttpMethod.Get,
            WithCacheNonce("/api/jobs/history"),
            payload: null,
            cancellationToken);

    public Task<Cove.Api.Services.JobReplayRequest> GetJobRetryRequestAsync(
        string jobId,
        CancellationToken cancellationToken = default)
        => SendAsync<Cove.Api.Services.JobReplayRequest>(
            HttpMethod.Get,
            WithCacheNonce($"/api/jobs/{Uri.EscapeDataString(jobId)}/retry-request"),
            payload: null,
            cancellationToken);

    public async Task<HttpStatusCode> GetJobRetryRequestStatusAsync(
        string jobId,
        CancellationToken cancellationToken = default)
    {
        using var response = await _client.GetAsync(
            WithCacheNonce($"/api/jobs/{Uri.EscapeDataString(jobId)}/retry-request"),
            cancellationToken);
        return response.StatusCode;
    }

    /// <summary>Sends a finished job's request again, as the UI's Retry does, and returns the new job id.</summary>
    public async Task<string> SendJobRetryRequestAsync(
        Cove.Api.Services.JobReplayRequest retryRequest,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(new HttpMethod(retryRequest.Method), retryRequest.Path);
        if (retryRequest.Body is not null)
            request.Content = new StringContent(retryRequest.Body, System.Text.Encoding.UTF8, "application/json");

        using var response = await _client.SendAsync(request, cancellationToken);
        var payload = await ApiResponse.ReadAsync<JsonElement>(
            response,
            $"{retryRequest.Method} {retryRequest.Path}",
            cancellationToken);
        return payload.GetProperty("jobId").GetString()
            ?? throw new InvalidOperationException($"{retryRequest.Method} {retryRequest.Path} did not return a job id.");
    }

    private async Task<string> StartJobAsync(
        string requestUri,
        CancellationToken cancellationToken)
    {
        using var response = await _client.PostAsync(requestUri, content: null, cancellationToken);
        if (response.StatusCode is not HttpStatusCode.Accepted)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(
                $"POST {requestUri} returned {(int)response.StatusCode} ({response.StatusCode}). Response: {body}");
        }

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>(ApiJson.Options, cancellationToken);
        return payload.GetProperty("jobId").GetString()
            ?? throw new InvalidOperationException($"POST {requestUri} did not return a job id.");
    }

    private async Task SendJobControlAsync(
        HttpMethod method,
        string requestUri,
        object? payload,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, requestUri);
        if (payload is not null)
            request.Content = JsonContent.Create(payload, options: ApiJson.Options);

        using var response = await _client.SendAsync(request, cancellationToken);
        if (response.StatusCode is HttpStatusCode.OK)
            return;

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        throw new InvalidOperationException(
            $"{method} {requestUri} returned {(int)response.StatusCode} ({response.StatusCode}); expected 200 (OK). Response: {body}");
    }
}
