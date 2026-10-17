using Cove.Core.Entities;

namespace Cove.Core.Interfaces;

/// <summary>
/// Filter criteria for querying segments. The plain properties scope the query the way the segment
/// library's flat query parameters do; the <c>…Criterion</c> properties carry the filter dialog's
/// criteria, named so a list page's object filter deserializes onto them the way
/// <see cref="VideoFilter"/> does for videos.
/// </summary>
public sealed class SegmentFilter
{
    public SegmentHostType? HostType { get; init; }
    public int? HostId { get; init; }
    /// <summary>Exact source key match.</summary>
    public string? SourceKey { get; init; }
    /// <summary>When set, only segments whose RefId matches one of these values are returned.</summary>
    public IReadOnlyList<long>? RefIds { get; init; }

    /// <summary>Only these segment ids.</summary>
    public List<int>? Ids { get; set; }
    /// <summary>Never these segment ids; lets a caller leave out the segments it already handled.</summary>
    public List<int>? ExcludeIds { get; set; }
    /// <summary>Only segments hosted by these videos.</summary>
    public List<int>? VideoIds { get; set; }
    public List<int>? ExcludeVideoIds { get; set; }
    /// <summary>Only segments of these tags; <see cref="TagDepth"/> of -1 includes each tag's descendants.</summary>
    public List<int>? TagIds { get; set; }
    public int? TagDepth { get; set; }
    /// <summary>Only segments whose host video carries one of these tags; <see cref="VideoTagDepth"/> of -1 includes descendants.</summary>
    public List<int>? VideoTagIds { get; set; }
    public int? VideoTagDepth { get; set; }
    /// <summary>Only face or performer segments that resolve to one of these performers.</summary>
    public List<int>? PerformerIds { get; set; }
    /// <summary>"user" for segments people made, "extensions" for segments extensions wrote.</summary>
    public string? SourceCategory { get; set; }
    /// <summary>True for segments that carry a tag, false for those that do not.</summary>
    public bool? Tagged { get; set; }
    public float? MinConfidence { get; set; }
    public double? MinDurationSec { get; set; }

    public StringCriterion? TitleCriterion { get; set; }
    public StringCriterion? KindCriterion { get; set; }
    public StringCriterion? SourceKeyCriterion { get; set; }
    public StringCriterion? SourceRunIdCriterion { get; set; }
    public StringCriterion? ColorHintCriterion { get; set; }
    public StringCriterion? VideoTitleCriterion { get; set; }
    public BoolCriterion? HasImageCriterion { get; set; }
    public BoolCriterion? HasPayloadCriterion { get; set; }
    public DoubleCriterion? StartSecCriterion { get; set; }
    public DoubleCriterion? EndSecCriterion { get; set; }
    public DoubleCriterion? DurationCriterion { get; set; }
    /// <summary>Compared against the stored 0..1 confidence; segments without a confidence never satisfy a bound.</summary>
    public DoubleCriterion? ConfidenceCriterion { get; set; }
    public TimestampCriterion? CreatedAtCriterion { get; set; }
    public TimestampCriterion? UpdatedAtCriterion { get; set; }
    public MultiIdCriterion? TagsCriterion { get; set; }
    public MultiIdCriterion? VideosCriterion { get; set; }
    public MultiIdCriterion? VideoTagsCriterion { get; set; }
    public MultiIdCriterion? PerformersCriterion { get; set; }
    public MultiIdCriterion? FacesCriterion { get; set; }
}

/// <summary>
/// One row of the segment library: the segment plus the names the list shows and sorts by. Segments
/// reference their host, tag, face and performer by id only, so the library resolves them once here.
/// </summary>
public sealed class SegmentLibraryItem
{
    public required Segment Segment { get; set; }
    public string? VideoTitle { get; set; }
    public string? TagName { get; set; }
    /// <summary>The face's label or the performer's name for face and performer segments.</summary>
    public string? RefLabel { get; set; }
    public int? FaceId { get; set; }
    public int? FacePerformerId { get; set; }
    public int? DirectPerformerId { get; set; }
    /// <summary>The performer the segment resolves to, directly or through its face.</summary>
    public int? PerformerId { get; set; }
    public string? PerformerName { get; set; }
}

public sealed record SegmentAggregate(int Count, double Duration);

/// <summary>
/// Generic repository for timeline segment CRUD (audio, face, tag, and other segment types).
/// Available to any extension that writes or reads timeline segments.
/// </summary>
public interface ISegmentRepository
{
    Task<IReadOnlyList<Segment>> FindAsync(SegmentFilter filter, CancellationToken ct = default);

    /// <summary>
    /// The segment library query behind the Segments page: every criterion of <paramref name="filter"/>,
    /// the search, sort (including seeded random) and paging of <paramref name="findFilter"/>, returning
    /// the page's rows with their display names and the total match count. Only video-hosted segments
    /// whose video still exists are listed.
    /// </summary>
    /// <remarks>
    /// Default bodies keep repositories compiled against earlier Cove binary compatible, the way
    /// <see cref="IVideoRepository.FindIdsAsync"/> was added; Cove implements both in SegmentRepository.
    /// </remarks>
    Task<(IReadOnlyList<SegmentLibraryItem> Items, int TotalCount)> FindAsync(SegmentFilter? filter, FindFilter? findFilter, CancellationToken ct = default)
        => throw new NotSupportedException("This segment repository predates the segment library query.");

    /// <summary>Count and summed duration of the segments the library query matches.</summary>
    Task<SegmentAggregate> AggregateAsync(SegmentFilter? filter, FindFilter? findFilter, CancellationToken ct = default)
        => throw new NotSupportedException("This segment repository predates the segment library query.");

    void Add(Segment segment);
    void RemoveRange(IEnumerable<Segment> segments);

    /// <summary>Re-points face-ref segments from <paramref name="oldRefIds"/> to <paramref name="newRefId"/>.</summary>
    Task UpdateRefIdAsync(string sourceKey, IReadOnlyList<long> oldRefIds, long newRefId, CancellationToken ct = default);

    /// <summary>Re-points the segments of <paramref name="oldRefId"/> that came from the given runs to
    /// <paramref name="newRefId"/>.</summary>
    Task ReassignRefByRunAsync(string sourceKey, long oldRefId, IReadOnlyCollection<string> runIds, long newRefId, CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
