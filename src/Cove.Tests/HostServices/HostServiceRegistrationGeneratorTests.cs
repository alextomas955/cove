using System.Collections.Immutable;
using System.IO;
using Cove.HostServices.Generator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Cove.Tests.HostServices;

public sealed class HostServiceRegistrationGeneratorTests
{
    // A stand-in for the real Cove.Core.Contracts attribute. The generator matches by fully-qualified
    // metadata name, so declaring the shape here lets each test control the compilation in isolation.
    private const string AttributeSource = """
        namespace Cove.Core.Contracts
        {
            public enum ServiceForwardingLifetime { Transient, Scoped, Singleton }

            [System.AttributeUsage(System.AttributeTargets.Class, AllowMultiple = true)]
            public sealed class ExposeToExtensionsAttribute : System.Attribute
            {
                public ExposeToExtensionsAttribute(System.Type interfaceType) { InterfaceType = interfaceType; }
                public System.Type InterfaceType { get; }
                public ServiceForwardingLifetime Lifetime { get; init; } = ServiceForwardingLifetime.Transient;
            }
        }
        """;

    private static readonly MetadataReference[] References =
        ((string)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")!)
            .Split(Path.PathSeparator)
            .Where(p => !string.IsNullOrEmpty(p))
            .Select(p => (MetadataReference)MetadataReference.CreateFromFile(p))
            .ToArray();

    private static (string GeneratedSource, ImmutableArray<Diagnostic> Diagnostics) Run(string source)
    {
        var compilation = CSharpCompilation.Create(
            assemblyName: "GeneratorInput",
            syntaxTrees:
            [
                CSharpSyntaxTree.ParseText(AttributeSource),
                CSharpSyntaxTree.ParseText(source),
            ],
            references: References,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));

        var driver = CSharpGeneratorDriver.Create(new HostServiceRegistrationGenerator())
            .RunGenerators(compilation);
        var result = driver.GetRunResult();

        var generated = result.GeneratedTrees.Length > 0
            ? result.GeneratedTrees[0].ToString()
            : string.Empty;
        var diagnostics = result.Results.SelectMany(r => r.Diagnostics).ToImmutableArray();
        return (generated, diagnostics);
    }

    [Fact]
    public void ConformingType_EmitsTransientForwardingRegistration()
    {
        const string source = """
            namespace Cove.Core.Interfaces { public interface IMetadataServerService { } }
            namespace Cove.Api.Services
            {
                [Cove.Core.Contracts.ExposeToExtensions(typeof(Cove.Core.Interfaces.IMetadataServerService))]
                public class MetadataServerService : Cove.Core.Interfaces.IMetadataServerService { }
            }
            """;

        var (generated, diagnostics) = Run(source);

        Assert.Empty(diagnostics);
        Assert.Contains("public static IServiceCollection AddCoveHostServices(this IServiceCollection services)", generated);
        Assert.Contains(
            "services.AddTransient<Cove.Core.Interfaces.IMetadataServerService>(sp => sp.GetRequiredService<Cove.Api.Services.MetadataServerService>());",
            generated);
    }

    [Fact]
    public void SingletonLifetime_EmitsSingletonForwardingRegistration()
    {
        const string source = """
            namespace Sample
            {
                public interface IReferencePerformerImporter { }

                [Cove.Core.Contracts.ExposeToExtensions(
                    typeof(IReferencePerformerImporter),
                    Lifetime = Cove.Core.Contracts.ServiceForwardingLifetime.Singleton)]
                public class ReferencePerformerImporter : IReferencePerformerImporter { }
            }
            """;

        var (generated, diagnostics) = Run(source);

        Assert.Empty(diagnostics);
        Assert.Contains(
            "services.AddSingleton<Sample.IReferencePerformerImporter>(sp => sp.GetRequiredService<Sample.ReferencePerformerImporter>());",
            generated);
    }

    [Fact]
    public void MarkedTypeThatDoesNotImplementInterface_ReportsCove0001Error()
    {
        const string source = """
            namespace Sample
            {
                public interface IUnrelated { }

                [Cove.Core.Contracts.ExposeToExtensions(typeof(IUnrelated))]
                public class NotUnrelated { }
            }
            """;

        var (generated, diagnostics) = Run(source);

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal("COVE0001", diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.DoesNotContain("GetRequiredService<Sample.NotUnrelated>", generated);
    }

    [Fact]
    public void MultipleConformingTypes_EmitInFullyQualifiedOrdinalOrder()
    {
        // Declared Zeta-before-Alpha; output must be Alpha-before-Zeta (ordinal by concrete FQN).
        const string source = """
            namespace Sample
            {
                public interface IZeta { }
                public interface IAlpha { }

                [Cove.Core.Contracts.ExposeToExtensions(typeof(IZeta))]
                public class ZetaService : IZeta { }

                [Cove.Core.Contracts.ExposeToExtensions(typeof(IAlpha))]
                public class AlphaService : IAlpha { }
            }
            """;

        var (generated, diagnostics) = Run(source);

        Assert.Empty(diagnostics);
        var alphaIndex = generated.IndexOf("GetRequiredService<Sample.AlphaService>", StringComparison.Ordinal);
        var zetaIndex = generated.IndexOf("GetRequiredService<Sample.ZetaService>", StringComparison.Ordinal);
        Assert.True(alphaIndex >= 0 && zetaIndex >= 0, "both forwarding lines should be emitted");
        Assert.True(alphaIndex < zetaIndex, "registrations must be emitted in fully-qualified ordinal order");
    }
}
