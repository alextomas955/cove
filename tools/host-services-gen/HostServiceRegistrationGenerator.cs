using System.Collections.Immutable;
using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Cove.HostServices.Generator;

/// <summary>
/// Emits a single <c>AddCoveHostServices(this IServiceCollection)</c> extension method that forwards each
/// concrete type marked with the exposure attribute to its declared interface at the declared lifetime, and
/// reports a compile-time error when a marked type does not implement the interface it is exposed as.
/// </summary>
[Generator]
public sealed class HostServiceRegistrationGenerator : IIncrementalGenerator
{
    private const string AttributeMetadataName = "Cove.Core.Contracts.ExposeToExtensionsAttribute";

    private static readonly DiagnosticDescriptor InterfaceNotImplemented = new(
        id: "COVE0001",
        title: "Exposed service must implement its declared interface",
        messageFormat: "'{0}' is exposed as '{1}' but does not implement it",
        category: "Cove.HostServices",
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true);

    private static readonly SymbolDisplayFormat FullyQualifiedNoGlobal = new(
        globalNamespaceStyle: SymbolDisplayGlobalNamespaceStyle.Omitted,
        typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypesAndNamespaces,
        genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters);

    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        var models = context.SyntaxProvider
            .ForAttributeWithMetadataName(
                AttributeMetadataName,
                // The attribute targets AttributeTargets.Class, which C# also permits on records
                // (a reference-type record is a class). A record's declaration node is
                // RecordDeclarationSyntax, not ClassDeclarationSyntax, so both must be matched or a
                // marked record would be dropped with neither a forwarding registration nor COVE0001.
                predicate: static (node, _) => node is ClassDeclarationSyntax or RecordDeclarationSyntax,
                transform: static (ctx, _) => Extract(ctx))
            .Collect();

        context.RegisterSourceOutput(models, static (spc, collected) => Emit(spc, collected));
    }

    private static EquatableArray<ExposedService> Extract(GeneratorAttributeSyntaxContext context)
    {
        if (context.TargetSymbol is not INamedTypeSymbol concrete)
        {
            return EquatableArray<ExposedService>.Empty;
        }

        var concreteFqn = concrete.ToDisplayString(FullyQualifiedNoGlobal);
        var builder = ImmutableArray.CreateBuilder<ExposedService>(context.Attributes.Length);

        foreach (var attribute in context.Attributes)
        {
            if (attribute.ConstructorArguments.Length != 1 ||
                attribute.ConstructorArguments[0].Value is not INamedTypeSymbol declaredInterface)
            {
                continue;
            }

            var lifetime = ReadLifetime(attribute);
            var implements = concrete.AllInterfaces.Contains(declaredInterface, SymbolEqualityComparer.Default);
            var location = attribute.ApplicationSyntaxReference?.GetSyntax().GetLocation()
                ?? Location.None;

            builder.Add(new ExposedService(
                concreteFqn,
                declaredInterface.ToDisplayString(FullyQualifiedNoGlobal),
                lifetime,
                implements,
                location));
        }

        return new EquatableArray<ExposedService>(builder.ToImmutable());
    }

    private static ForwardingLifetime ReadLifetime(AttributeData attribute)
    {
        foreach (var named in attribute.NamedArguments)
        {
            if (named.Key == "Lifetime" && named.Value.Value is int value)
            {
                return value switch
                {
                    1 => ForwardingLifetime.Scoped,
                    2 => ForwardingLifetime.Singleton,
                    _ => ForwardingLifetime.Transient,
                };
            }
        }

        return ForwardingLifetime.Transient;
    }

    private static void Emit(SourceProductionContext context, ImmutableArray<EquatableArray<ExposedService>> collected)
    {
        var conforming = new List<ExposedService>();

        foreach (var group in collected)
        {
            foreach (var service in group.AsSpan())
            {
                if (service.Implements)
                {
                    conforming.Add(service);
                }
                else
                {
                    context.ReportDiagnostic(Diagnostic.Create(
                        InterfaceNotImplemented,
                        service.Location,
                        service.ConcreteFqn,
                        service.InterfaceFqn));
                }
            }
        }

        conforming.Sort(static (a, b) =>
        {
            var byConcrete = string.CompareOrdinal(a.ConcreteFqn, b.ConcreteFqn);
            return byConcrete != 0 ? byConcrete : string.CompareOrdinal(a.InterfaceFqn, b.InterfaceFqn);
        });

        var source = new StringBuilder();
        source.AppendLine("// <auto-generated/>");
        source.AppendLine("#nullable enable");
        source.AppendLine("using Microsoft.Extensions.DependencyInjection;");
        source.AppendLine();
        source.AppendLine("namespace Cove.Api.HostServices;");
        source.AppendLine();
        source.AppendLine("internal static class GeneratedHostServiceRegistrations");
        source.AppendLine("{");
        source.AppendLine("    public static IServiceCollection AddCoveHostServices(this IServiceCollection services)");
        source.AppendLine("    {");

        foreach (var service in conforming)
        {
            var method = service.Lifetime switch
            {
                ForwardingLifetime.Scoped => "AddScoped",
                ForwardingLifetime.Singleton => "AddSingleton",
                _ => "AddTransient",
            };

            source.Append("        services.")
                .Append(method)
                .Append('<')
                .Append(service.InterfaceFqn)
                .Append(">(sp => sp.GetRequiredService<")
                .Append(service.ConcreteFqn)
                .AppendLine(">());");
        }

        source.AppendLine("        return services;");
        source.AppendLine("    }");
        source.AppendLine("}");

        context.AddSource("GeneratedHostServiceRegistrations.g.cs", source.ToString());
    }
}
