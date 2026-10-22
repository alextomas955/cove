using System.Globalization;
using Cove.Api.Updates;
using Cove.Core.Auth;
using Cove.Core.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace Cove.Api.Controllers;

/// <summary>
/// Cove's own updates. Everything here, including the status, needs <c>system.update</c>: the status
/// exposes the install layout and only someone who can act on it needs the notice.
/// </summary>
[ApiController]
[Route("api/updates")]
[RequiresPermission(Permissions.SystemUpdate)]
public class UpdatesController : ControllerBase
{
    private readonly UpdateService _updates;
    private readonly ICurrentPrincipalAccessor _principal;

    public UpdatesController(UpdateService updates, ICurrentPrincipalAccessor principal)
    {
        _updates = updates;
        _principal = principal;
    }

    [HttpGet("status")]
    [RequiresPermission(Permissions.SystemUpdate)]
    public async Task<ActionResult<UpdateStatusDto>> GetStatus(CancellationToken ct)
        => Ok(await _updates.GetStatusAsync(ct));

    /// <summary>Checks the release feed now. Limited to one forced check per minute.</summary>
    [HttpPost("check")]
    [RequiresPermission(Permissions.SystemUpdate)]
    public async Task<ActionResult<UpdateStatusDto>> Check(CancellationToken ct)
    {
        if (!_updates.TryBeginForcedCheck(out var retryAfter))
        {
            Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
            return Problem(
                statusCode: StatusCodes.Status429TooManyRequests,
                title: "Checked recently",
                detail: $"Wait {Math.Ceiling(retryAfter.TotalSeconds):0} seconds before checking again.");
        }

        await _updates.CheckAsync(ct);
        return Ok(await _updates.GetStatusAsync(ct));
    }

    /// <summary>Downloads, verifies, backs up, installs, and restarts into the available update (native installs only).</summary>
    [HttpPost("apply")]
    [RequiresPermission(Permissions.SystemUpdate)]
    public ActionResult<UpdateActionResultDto> Apply([FromBody] UpdateApplyRequest? request)
        => ToResult(_updates.StartApply(_principal.Current, request?.Force == true, automatic: false));

    /// <summary>Restores the version that the last update replaced, while no migration has run since.</summary>
    [HttpPost("revert")]
    [RequiresPermission(Permissions.SystemUpdate)]
    public async Task<ActionResult<UpdateActionResultDto>> Revert(CancellationToken ct)
        => ToResult(await _updates.RevertAsync(_principal.Current, ct));

    [HttpPut("settings")]
    [RequiresPermission(Permissions.SystemUpdate)]
    public async Task<ActionResult<UpdateStatusDto>> SaveSettings([FromBody] UpdatesConfigDto settings, CancellationToken ct)
    {
        await _updates.SaveSettingsAsync(settings);
        return Ok(await _updates.GetStatusAsync(ct));
    }

    private ActionResult<UpdateActionResultDto> ToResult(UpdateActionOutcome outcome)
        => outcome.StatusCode is >= 200 and < 300
            ? StatusCode(outcome.StatusCode, new UpdateActionResultDto(outcome.JobId, outcome.Message))
            : Problem(statusCode: outcome.StatusCode, detail: outcome.Message);
}
