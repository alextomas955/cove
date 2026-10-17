using Cove.Core.Entities;

namespace Cove.Core.Interfaces;

/// <summary>
/// Filter criteria for querying faces. The plain scoping properties are shared by
/// <see cref="IFaceRepository.FindFacesAsync"/> and <see cref="IFaceRepository.FindAsync"/>; the
/// <c>*Criterion</c> properties are the faces list's filter dialog keys (camelCased in the UI), so the
/// list's object filter deserializes straight into this type.
/// </summary>
public sealed class FaceFilter
{
    /// <summary>Match faces by PrimarySourceKey (exact, case-insensitive).</summary>
    public IReadOnlyList<string>? PrimarySourceKeys { get; init; }
    /// <summary>Match faces by ID.</summary>
    public IReadOnlyList<int>? Ids { get; init; }
    public bool? HasPerformer { get; init; }
    public bool? Ignored { get; init; }
    /// <summary>
    /// When false, only returns faces that have not been merged (MergedIntoFaceId == null). Honored by
    /// <see cref="IFaceRepository.FindFacesAsync"/> only: the list (<see cref="IFaceRepository.FindAsync"/>)
    /// never surfaces merged faces, which are tombstones kept for re-scan redirect and un-merge.
    /// </summary>
    public bool? IsMerged { get; init; }
    /// <summary>When true, includes the Performer navigation (with RemoteIds) in results.</summary>
    public bool IncludePerformer { get; init; } = false;

    // ── List criteria (IFaceRepository.FindAsync) ────────────────────────────

    /// <summary>Only faces linked to this performer.</summary>
    public int? PerformerId { get; init; }
    /// <summary>
    /// Accepted for parity with the faces list's <c>mergedIntoFaceId</c> parameter. Not applied by
    /// <see cref="IFaceRepository.FindAsync"/>, which never surfaces merged faces (see <see cref="IsMerged"/>).
    /// </summary>
    public int? MergedIntoFaceId { get; init; }
    /// <summary>Linked to a performer (true) or unlinked (false).</summary>
    public BoolCriterion? LinkedCriterion { get; init; }
    public StringCriterion? LabelCriterion { get; init; }
    /// <summary>The key of the provider that produced the cluster (for example an AI Faces identity key).</summary>
    public StringCriterion? PrimarySourceKeyCriterion { get; init; }
    /// <summary>
    /// Matches the file paths of the videos and images the face appears in; a face has no file of its own.
    /// Callers must hold the files-read permission to use it.
    /// </summary>
    public StringCriterion? PathCriterion { get; init; }
    public BoolCriterion? HasCoverCriterion { get; init; }
    public BoolCriterion? IgnoredCriterion { get; init; }
    /// <summary>The linked performer.</summary>
    public MultiIdCriterion? PerformersCriterion { get; init; }
    /// <summary>The local performer of the face's materialized top suggestion (unlinked faces only).</summary>
    public MultiIdCriterion? TopSuggestionPerformersCriterion { get; init; }
    public IntCriterion? DetectionCountCriterion { get; init; }
    public IntCriterion? AppearanceCountCriterion { get; init; }
    public IntCriterion? FrameSampleCountCriterion { get; init; }
    public IntCriterion? VideoCountCriterion { get; init; }
    public IntCriterion? ImageCountCriterion { get; init; }
    /// <summary>
    /// Lower bound on the materialized top-suggestion confidence (unlinked faces only). Percent (0..100);
    /// a value of at most 1 is read as a 0..1 fraction.
    /// </summary>
    public double? MinSuggestionConfidence { get; init; }
    /// <summary>
    /// The materialized top-suggestion confidence (unlinked faces only). Percent (0..100); values of at
    /// most 1 are read as 0..1 fractions.
    /// </summary>
    public DoubleCriterion? SuggestionConfidenceCriterion { get; init; }
    public List<CustomFieldCriterion>? CustomFieldCriteria { get; init; }
}

/// <summary>Filter criteria for querying face appearances.</summary>
public sealed class FaceAppearanceFilter
{
    public FaceAppearanceHostType? HostType { get; init; }
    public int? HostId { get; init; }
    public string? SourceKey { get; init; }
    /// <summary>When set, only appearances whose FaceId is in this list are returned.</summary>
    public IReadOnlyList<int>? FaceIds { get; init; }
}

/// <summary>
/// Generic repository for face identity and face appearance CRUD.
/// Available to any extension that reads or writes face cluster data, appearances, and identity links.
/// All Add/Remove calls are change-tracked; call SaveChangesAsync once at the end.
/// </summary>
public interface IFaceRepository
{
    // ── Faces ────────────────────────────────────────────────────────────────
    Task<IReadOnlyList<Face>> FindFacesAsync(FaceFilter filter, bool tracking = false, CancellationToken ct = default);

    /// <summary>
    /// The faces list: search (<see cref="FindFilter.Q"/>), every <see cref="FaceFilter"/> criterion, the
    /// list's sort keys (including <c>suggestion_confidence</c> and seeded <c>random</c>) and paging, with
    /// merged faces excluded. Results include the Performer navigation. A <see cref="FindFilter.PerPage"/>
    /// of 0 or less returns the count only.
    /// </summary>
    // Cove's FaceRepository implements this. The default body exists only so third-party
    // implementations of the interface compiled against an earlier Cove.Core stay binary compatible
    // (ApiCompat reports an added abstract interface member as a break); it is not a usable fallback.
    Task<(IReadOnlyList<Face> Items, int TotalCount)> FindAsync(FaceFilter? filter, FindFilter? findFilter, CancellationToken ct = default)
        => throw new NotSupportedException($"{GetType().FullName} does not implement {nameof(IFaceRepository)}.{nameof(FindAsync)}.");
    Task<Face?> GetFaceAsync(int faceId, bool tracking = true, CancellationToken ct = default);
    Task<bool> FaceExistsAsync(int faceId, CancellationToken ct = default);
    void AddFace(Face face);

    // ── Face Appearances ─────────────────────────────────────────────────────
    Task<IReadOnlyList<FaceAppearance>> FindAppearancesAsync(FaceAppearanceFilter filter, CancellationToken ct = default);
    void AddAppearance(FaceAppearance appearance);
    void RemoveAppearances(IEnumerable<FaceAppearance> appearances);

    /// <summary>Re-points appearances from <paramref name="oldFaceIds"/> to <paramref name="newFaceId"/>.</summary>
    Task UpdateAppearanceFaceIdAsync(string sourceKey, IReadOnlyList<int> oldFaceIds, int newFaceId, CancellationToken ct = default);

    /// <summary>Re-points the appearances of <paramref name="oldFaceId"/> that came from the given runs
    /// (host-scoped, since one run is one processed host) to <paramref name="newFaceId"/>. Returns the
    /// number of appearances moved.</summary>
    Task<int> ReassignAppearancesByRunAsync(string sourceKey, int oldFaceId, IReadOnlyCollection<string> runIds, int newFaceId, CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
