using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cove.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNaturalSortCollation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:CollationDefinition:cove_natural", "und-u-kn,und-u-kn,icu,True")
                .Annotation("Npgsql:PostgresExtension:vector", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:vector", ",,");

            migrationBuilder.CreateIndex(
                name: "IX_videos_MaxPath_natural",
                table: "videos",
                column: "MaxPath")
                .Annotation("Relational:Collation", new[] { "cove_natural" });

            migrationBuilder.CreateIndex(
                name: "IX_videos_MinPath_natural",
                table: "videos",
                column: "MinPath")
                .Annotation("Relational:Collation", new[] { "cove_natural" });

            migrationBuilder.CreateIndex(
                name: "IX_videos_Title_natural",
                table: "videos",
                column: "Title")
                .Annotation("Relational:Collation", new[] { "cove_natural" });

            migrationBuilder.CreateIndex(
                name: "IX_images_MaxPath_natural",
                table: "images",
                column: "MaxPath")
                .Annotation("Relational:Collation", new[] { "cove_natural" });

            migrationBuilder.CreateIndex(
                name: "IX_images_MinPath_natural",
                table: "images",
                column: "MinPath")
                .Annotation("Relational:Collation", new[] { "cove_natural" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_videos_MaxPath_natural",
                table: "videos");

            migrationBuilder.DropIndex(
                name: "IX_videos_MinPath_natural",
                table: "videos");

            migrationBuilder.DropIndex(
                name: "IX_videos_Title_natural",
                table: "videos");

            migrationBuilder.DropIndex(
                name: "IX_images_MaxPath_natural",
                table: "images");

            migrationBuilder.DropIndex(
                name: "IX_images_MinPath_natural",
                table: "images");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:vector", ",,")
                .OldAnnotation("Npgsql:CollationDefinition:cove_natural", "und-u-kn,und-u-kn,icu,True")
                .OldAnnotation("Npgsql:PostgresExtension:vector", ",,");
        }
    }
}
