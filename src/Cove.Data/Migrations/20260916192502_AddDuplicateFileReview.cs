using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cove.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDuplicateFileReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "duplicate_ignored_file_pairs",
                columns: table => new
                {
                    LowFileId = table.Column<int>(type: "integer", nullable: false),
                    HighFileId = table.Column<int>(type: "integer", nullable: false),
                    DecisionCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_duplicate_ignored_file_pairs", x => new { x.LowFileId, x.HighFileId });
                    table.CheckConstraint("CK_duplicate_ignored_file_pairs_decision_count", "\"DecisionCount\" > 0");
                    table.CheckConstraint("CK_duplicate_ignored_file_pairs_ordered", "\"LowFileId\" < \"HighFileId\"");
                    table.ForeignKey(
                        name: "FK_duplicate_ignored_file_pairs_files_HighFileId",
                        column: x => x.HighFileId,
                        principalTable: "files",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_duplicate_ignored_file_pairs_files_LowFileId",
                        column: x => x.LowFileId,
                        principalTable: "files",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "duplicate_search_file_items",
                columns: table => new
                {
                    GroupId = table.Column<int>(type: "integer", nullable: false),
                    FileId = table.Column<int>(type: "integer", nullable: false),
                    VideoId = table.Column<int>(type: "integer", nullable: false),
                    Keep = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_duplicate_search_file_items", x => new { x.GroupId, x.FileId });
                    table.ForeignKey(
                        name: "FK_duplicate_search_file_items_duplicate_search_groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "duplicate_search_groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_duplicate_search_file_items_files_FileId",
                        column: x => x.FileId,
                        principalTable: "files",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_duplicate_search_file_items_videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "videos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_duplicate_ignored_file_pairs_HighFileId",
                table: "duplicate_ignored_file_pairs",
                column: "HighFileId");

            migrationBuilder.CreateIndex(
                name: "IX_duplicate_search_file_items_FileId",
                table: "duplicate_search_file_items",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_duplicate_search_file_items_VideoId",
                table: "duplicate_search_file_items",
                column: "VideoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "duplicate_ignored_file_pairs");

            migrationBuilder.DropTable(
                name: "duplicate_search_file_items");
        }
    }
}
