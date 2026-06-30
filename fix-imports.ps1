# Move components folder out of app/
Move-Item -Path "app\components" -Destination "components"

# Fix all import paths
Get-ChildItem -Path app -Recurse -Include *.jsx,*.js | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $original = $content
    $content = $content -replace "from(\s+)(['""])\.\./\.\./\.\./components/", 'from$1$2../../../../components/'
    $content = $content -replace "from(\s+)(['""])\.\./\.\./components/", 'from$1$2../../../components/'
    $content = $content -replace "from(\s+)(['""])\.\./components/", 'from$1$2../../components/'
    $content = $content -replace "from(\s+)(['""])\./components/", 'from$1$2../components/'
    if ($content -ne $original) {
        Set-Content -Path $_.FullName -Value $content -NoNewline
        Write-Output "Updated: $($_.FullName)"
    }
}