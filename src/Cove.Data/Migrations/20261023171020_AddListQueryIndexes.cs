using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cove.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddListQueryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_segments_TagId",
                table: "segments");

            migrationBuilder.DropIndex(
                name: "IX_files_ImageId_Basename",
                table: "files");

            migrationBuilder.CreateIndex(
                name: "IX_segments_HostType_CreatedAt_Id",
                table: "segments",
                columns: new[] { "HostType", "CreatedAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_segments_HostType_UpdatedAt_Id",
                table: "segments",
                columns: new[] { "HostType", "UpdatedAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_segments_TagId_HostType_HostId",
                table: "segments",
                columns: new[] { "TagId", "HostType", "HostId" });

            migrationBuilder.CreateIndex(
                name: "IX_files_ImageId_Basename_natural",
                table: "files",
                columns: new[] { "ImageId", "Basename" },
                filter: "\"ImageId\" IS NOT NULL")
                .Annotation("Relational:Collation", new[] { null, "cove_natural" });

            // The segment library joins faces and performers on segments."RefId" (bigint), which EF
            // writes as a cast of the int primary key. The primary key index cannot serve that predicate,
            // and without statistics on the cast PostgreSQL guesses each join multiplies the rows, so it
            // sorts every segment for merge joins instead of hashing the small tables. Expression indexes
            // give it both; ANALYZE collects their statistics now rather than whenever autovacuum next
            // gets to these rarely changing tables.
            migrationBuilder.Sql("CREATE INDEX \"IX_faces_Id_bigint\" ON \"faces\" ((\"Id\"::bigint));");
            migrationBuilder.Sql("CREATE INDEX \"IX_performers_Id_bigint\" ON \"performers\" ((\"Id\"::bigint));");
            migrationBuilder.Sql("ANALYZE \"faces\";");
            migrationBuilder.Sql("ANALYZE \"performers\";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_performers_Id_bigint\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_faces_Id_bigint\";");

            migrationBuilder.DropIndex(
                name: "IX_segments_HostType_CreatedAt_Id",
                table: "segments");

            migrationBuilder.DropIndex(
                name: "IX_segments_HostType_UpdatedAt_Id",
                table: "segments");

            migrationBuilder.DropIndex(
                name: "IX_segments_TagId_HostType_HostId",
                table: "segments");

            migrationBuilder.DropIndex(
                name: "IX_files_ImageId_Basename_natural",
                table: "files");

            migrationBuilder.CreateIndex(
                name: "IX_segments_TagId",
                table: "segments",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_files_ImageId_Basename",
                table: "files",
                columns: new[] { "ImageId", "Basename" },
                filter: "\"ImageId\" IS NOT NULL");
        }
    }
}
