// Compiler shim: init-only setters and records require this type, which is not present in netstandard2.0.
namespace System.Runtime.CompilerServices;

internal static class IsExternalInit
{
}
