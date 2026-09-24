using Cove.Core.Entities;
using Cove.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Cove.Tests;

public sealed class CoveContextNameConstraintTranslationTests
{
    // The name constraints are deferred, so the violation a concurrent writer causes arrives from the
    // commit as a bare PostgresException rather than wrapped by the statement that caused it. Left
    // untranslated it reached clients as an unexplained server error instead of a name conflict.
    [Fact]
    public void TranslatesAViolationRaisedByTheCommit()
    {
        var translated = CoveContext.TranslateNameConstraint(Violation(PostgresErrorCodes.ExclusionViolation, "UQ_studios_name"));

        var conflict = Assert.IsType<EntityNameConflictException>(translated);
        Assert.Equal(NameConflictEntityTypes.Studio, conflict.EntityType);
    }

    [Fact]
    public void TranslatesAViolationRaisedByTheStatement()
    {
        var translated = CoveContext.TranslateNameConstraint(
            new DbUpdateException("save failed", Violation(PostgresErrorCodes.UniqueViolation, "UQ_performers_identity")));

        var conflict = Assert.IsType<EntityNameConflictException>(translated);
        Assert.Equal(NameConflictEntityTypes.Performer, conflict.EntityType);
    }

    [Fact]
    public void TranslatesATagNamespaceViolationRaisedByTheCommit()
    {
        var translated = CoveContext.TranslateNameConstraint(Violation(PostgresErrorCodes.ExclusionViolation, "UQ_tag_name_claims_namespace"));

        Assert.IsType<TagNameConflictException>(translated);
    }

    [Fact]
    public void LeavesOtherFailuresAlone()
    {
        Assert.Null(CoveContext.TranslateNameConstraint(Violation(PostgresErrorCodes.ForeignKeyViolation, "FK_videos_studios_StudioId")));
        Assert.Null(CoveContext.TranslateNameConstraint(Violation(PostgresErrorCodes.UniqueViolation, "PK_studios")));
        Assert.Null(CoveContext.TranslateNameConstraint(new InvalidOperationException("not a database failure")));
    }

    private static PostgresException Violation(string sqlState, string constraintName)
        => new("constraint violated", "ERROR", "ERROR", sqlState, constraintName: constraintName);
}
