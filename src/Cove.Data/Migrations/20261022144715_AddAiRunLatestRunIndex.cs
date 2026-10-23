using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cove.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiRunLatestRunIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_ai_runs_TargetType_SourceKey_TargetId_StartedAt_Id",
                table: "ai_runs",
                columns: new[] { "TargetType", "SourceKey", "TargetId", "StartedAt", "Id" },
                descending: new[] { false, false, false, true, true })
                .Annotation("Npgsql:IndexInclude", new[] { "Status", "CompletedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ai_runs_TargetType_SourceKey_TargetId_StartedAt_Id",
                table: "ai_runs");
        }
    }
}
