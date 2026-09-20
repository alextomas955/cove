using Microsoft.AspNetCore.Mvc;
using Cove.Api.Services;
using Cove.Core.Auth;
using Cove.Core.Entities;

namespace Cove.Api.Controllers;

public sealed class VideoConversionRequestDto
{
    public List<int> VideoIds { get; set; } = [];
    /// <summary>"h264", "hevc", "av1", or "copy" to keep the video stream and change only the container.</summary>
    public string Codec { get; set; } = "hevc";
    /// <summary>"mp4" or "mkv".</summary>
    public string Container { get; set; } = "mp4";
    /// <summary>
    /// One rung of the conversion ladder, from most quality to most speed:
    /// "qualitySoftware", "highSoftware", "balancedSoftware", "smallerSoftware",
    /// "qualityHardware", "smallerHardware".
    /// </summary>
    public string Effort { get; set; } = "balancedSoftware";
    /// <summary>Verify each converted file, make it the video's primary file and delete the original from disk.</summary>
    public bool ReplaceOriginal { get; set; }
    /// <summary>Throw a re-encoded file away when it is not smaller than the original.</summary>
    public bool DiscardIfLarger { get; set; } = true;
}

[ApiController]
[Route("api/video-conversion")]
[RequiresPermission(Permissions.VideosRead)]
public sealed class VideoConversionController(
    VideoConversionJobService conversionService,
    ICurrentPrincipalAccessor principalAccessor) : ControllerBase
{
    /// <summary>The encoder each codec would use on this machine. The first call runs short test encodes.</summary>
    [HttpGet("encoders")]
    [RequiresPermission(Permissions.JobsRun)]
    public ActionResult<IReadOnlyList<VideoConversionEncoderInfo>> Encoders()
        => Ok(conversionService.DescribeEncoders());

    [HttpPost]
    [RequiresPermission(Permissions.JobsRun)]
    [RequiresPermission(Permissions.VideosWrite)]
    [RequiresPermissionWhenTrue(Permissions.VideosDeleteFile, ActionArgumentName = "dto", PropertyName = "ReplaceOriginal")]
    [RequiresEntityAccess(EntityKinds.Video, Permissions.VideosWrite, ActionArgumentName = "dto", PropertyName = "VideoIds")]
    public ActionResult<VideoConversionJobStart> Start([FromBody] VideoConversionRequestDto dto)
    {
        if (dto.ReplaceOriginal && principalAccessor.Current?.Has(Permissions.VideosDeleteFile) != true)
            return Forbid();

        if (dto.VideoIds.All(id => id <= 0))
            return BadRequest(new { error = "Select at least one video to convert." });

        if (!TryParse(dto.Codec, out VideoConversionCodec codec)
            || !TryParse(dto.Container, out VideoConversionContainer container)
            || !TryParse(dto.Effort, out VideoConversionEffort effort))
        {
            return BadRequest(new
            {
                error = "Unknown conversion option. Codec is h264, hevc, av1 or copy; container is mp4 or mkv; "
                    + "effort is qualitySoftware, highSoftware, balancedSoftware, smallerSoftware, "
                    + "qualityHardware or smallerHardware.",
            });
        }

        var settings = new VideoConversionSettings(codec, container, effort, dto.ReplaceOriginal, dto.DiscardIfLarger);
        return Accepted(conversionService.Start(principalAccessor.Current, dto.VideoIds, settings));
    }

    private static bool TryParse<TEnum>(string? value, out TEnum result) where TEnum : struct, Enum
        => Enum.TryParse(value?.Trim(), ignoreCase: true, out result)
            && Enum.IsDefined(result)
            // Enum.TryParse also accepts numbers; only the documented names are part of the API.
            && !int.TryParse(value, out _);
}
