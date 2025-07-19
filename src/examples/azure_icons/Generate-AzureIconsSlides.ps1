#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Generates a PowerPoint presentation of Azure service icons using Plotance.

.DESCRIPTION
    This script downloads Azure service icons and Plotance executable, then
    generates a PowerPoint presentation showing all Azure service icons
    organized by category.

.PARAMETER GridRows
    Number of rows per grid (default: 4)

.PARAMETER GridColumns
    Number of columns per grid (default: 4)

.PARAMETER IconHeight
    Height of icons in slides (default: "1cm")

.EXAMPLE
    .\Generate-AzureIconsSlides.ps1

.EXAMPLE
    .\Generate-AzureIconsSlides.ps1 -OutputName "my_azure_icons" -GridRows 3 -GridColumns 5
#>

param(
    [int]$GridRows = 4,
    [int]$GridColumns = 4,
    [string]$IconHeight = "1cm"
)

$AZURE_ICONS_URL = "https://arch-center.azureedge.net/icons/Azure_Public_Service_Icons_V21.zip"
$AZURE_ICONS_ARCHIVE = "Azure_Public_Service_Icons_V21.zip"
$ICONS_DIR = "icons"
$ICONS_EXTRACT_DIR = "icons/Azure_Public_Service_Icons/Icons"
$OUTPUT_NAME = "azure_icons"

$IsOld = $PSVersionTable.PSVersion.Major -le 5

if ($IsOld) {
    $IsWindows = $true
}

# Downloads Azure icons archive if not exists
function Get-AzureIconsArchive {
    if (-not (Test-Path $AZURE_ICONS_ARCHIVE)) {
        Write-Output "Downloading Azure icons archive..."
        try {
            Invoke-WebRequest `
              -Uri $AZURE_ICONS_URL `
              -OutFile $AZURE_ICONS_ARCHIVE
            Write-Output "Azure icons archive downloaded successfully"
        }
        catch {
            Write-Error "Failed to download Azure icons archive: $_"
            exit 1
        }
    }
}

# Extracts Azure icons archive
function Expand-AzureIconsArchive {
    if (-not (Test-Path $ICONS_DIR)) {
        Write-Output "Extracting Azure icons archive..."
        try {
            Expand-Archive `
              -Path $AZURE_ICONS_ARCHIVE `
              -DestinationPath $ICONS_DIR `
              -Force
            Write-Output "Azure icons archive extracted successfully"
        }
        catch {
            Write-Error "Failed to extract Azure icons archive: $_"
            exit 1
        }
    }
}

# Get OS and architecture for Plotance download
function Get-PlotanceDownloadInfo {
    $os = if ($IsWindows) {
        "win"
    }
    elseif ($IsMacOS) {
        "osx"
    }
    elseif ($IsLinux) {
        "linux"
    }
    else {
        Write-Error "Unsupported operating system"
        exit 1
    }

    $osArch = `
      [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
    $x64 = [System.Runtime.InteropServices.Architecture]::X64
    $arm64 = [System.Runtime.InteropServices.Architecture]::Arm64

    $arch = if ($osArch -eq $x64 -or $IsOld) {
        "x64"
    }
    elseif ($osArch -eq $arm64) {
        "arm64"
    }
    else {
        Write-Error "Unsupported CPU architecture: $osArch"
        exit 1
    }

    return @{
        OS = $os
        Architecture = $arch
        FileName = "plotance-$os-$arch.zip"
        URL = "https://github.com/plotance/plotance/releases/latest/download/plotance-$os-$arch.zip"
    }
}

# Downloads and extracts Plotance executable
function Get-PlotanceExecutable {
    $plotanceInfo = Get-PlotanceDownloadInfo
    $plotanceArchive = $plotanceInfo.FileName
    $plotanceExecutable = if ($IsWindows) { "plotance.exe" } else { "plotance" }

    if (-not (Test-Path $plotanceExecutable)) {
        Write-Output "Downloading Plotance executable for $($plotanceInfo.OS)-$($plotanceInfo.Architecture)..."

        try {
            Invoke-WebRequest -Uri $plotanceInfo.URL -OutFile $plotanceArchive
            Write-Output "Plotance archive downloaded successfully"

            Expand-Archive -Path $plotanceArchive -DestinationPath "." -Force

            if (-not $IsWindows) {
                chmod +x $plotanceExecutable
            }

            Remove-Item $plotanceArchive -Force

            Write-Output "Plotance executable extracted successfully"
        }
        catch {
            Write-Error "Failed to download or extract Plotance executable: $_"
            exit 1
        }
    }
}

# Extracts service name from filename
function Get-ServiceName {
    param([string]$FileName)

    # Pattern: {number}-icon-service-{service-name}.svg
    if ($FileName -match '^\d+-icon-service-(.+)\.svg$') {
        return $Matches[1] -replace '-', ' '
    }
    else {
        return $FileName -replace '\.svg$', ''
    }
}

# Capitalize category names
function Get-CapitalizedCategory {
    param([string]$Category)

    $specialWords = @{
        'ai' = 'AI'
        'iot' = 'IoT'
        'devops' = 'DevOps'
    }

    $result = $Category

    foreach ($word in $specialWords.Keys) {
        $result = $result -replace "(?i)\b$word\b", $specialWords[$word]
    }

    # Capitalize first letter of each word that wasn't specially handled
    $result = [regex]::Replace(
        $result,
        '\b[a-z]',
        { param($match) $match.Value.ToUpper() }
    )

    return $result
}

# Scan icons and organize by category
function Get-IconsByCategory {
    param([string]$IconsPath)

    $categories = @{}

    Get-ChildItem -Path $IconsPath -Directory | ForEach-Object {
        $categoryPath = $_.FullName
        $categoryName = $_.Name

        $svgFiles = Get-ChildItem -Path $categoryPath -Filter "*.svg" `
          | Sort-Object Name

        if ($svgFiles.Count -gt 0) {
            $categories[$categoryName] = @()

            foreach ($file in $svgFiles) {
                $categories[$categoryName] += @{
                    Path = $file.FullName
                    ServiceName = Get-ServiceName $file.Name
                }
            }
        }
    }

    return $categories
}

# Generate Markdown content for Plotance
function New-MarkdownContent {
    param(
        [hashtable]$Categories,
        [int]$Rows,
        [int]$Columns,
        [string]$Height
    )

    $iconsPerSlide = $Rows * $Columns
    $markdown = @()

    # Header
    $markdown += "# Azure Service Icons"
    $markdown += ""
    $markdown += "<?plotance"
    $markdown += " slide_level: 3"
    $markdown += " layout_direction: column"
    $markdown += " body_horizontal_align: center"
    $markdown += "?>"
    $markdown += ""

    foreach ($categoryName in ($Categories.Keys | Sort-Object)) {
        $icons = $Categories[$categoryName]
        $capitalizedCategory = Get-CapitalizedCategory $categoryName

        $markdown += "## $capitalizedCategory"
        $markdown += ""

        $totalSlides = [Math]::Ceiling($icons.Count / $iconsPerSlide)

        for ($slideNum = 1; $slideNum -le $totalSlides; $slideNum++) {
            $startIndex = ($slideNum - 1) * $iconsPerSlide
            $endIndex = [Math]::Min(
                $startIndex + $iconsPerSlide - 1,
                $icons.Count - 1
            )
            $slideIcons = $icons[$startIndex..$endIndex]

            $markdown += "<?plotance title_font_scale: 0.8 ?>"
            $markdown += ""
            $markdown += "### $capitalizedCategory ($slideNum/$totalSlides)"
            $markdown += ""

            # Layout settings
            $rowSpec = (@($Height, "1") * $Rows) -join ":"
            $columnSpec = (@("1") * $Columns) -join ":"

            $markdown += "<?plotance"
            $markdown += " rows: $rowSpec"
            $markdown += " columns: $columnSpec"
            $markdown += " body_font_scale: 0.5"
            $markdown += "?>"
            $markdown += ""

            for ($columnIndex = 0; $columnIndex -lt $Columns; $columnIndex++) {
                for ($rowIndex = 0; $rowIndex -lt $Rows; $rowIndex++) {
                    $iconIndex = $Columns * $rowIndex + $columnIndex

                    if ($iconIndex -lt $slideIcons.Count) {
                        $icon = $slideIcons[$iconIndex]
                        $iconPath = $icon.Path -replace '\\', '/'
                        $markdown += "![$($icon.ServiceName)](<$iconPath>)"
                        $markdown += ""
                        $markdown += $icon.ServiceName
                    }
                    else {
                        $markdown += "&nbsp;"
                        $markdown += ""
                        $markdown += "&nbsp;"
                    }

                    $markdown += ""
                }
            }

            $markdown += ""
        }
    }

    return $markdown -join "`n"
}

# Generate PowerPoint using Plotance
function New-PowerPointPresentation {
    param(
        [string]$MarkdownFile,
        [string]$PlotanceExecutable
    )

    Write-Output "Generating PowerPoint from $MarkdownFile..."

    try {
        & $PlotanceExecutable $MarkdownFile
        Write-Output "PowerPoint presentation generated successfully"
    }
    catch {
        Write-Error "Failed to generate PowerPoint presentation: $_"
        exit 1
    }
}

# The entrypoint
function Main {
    Write-Output "Starting Azure Icons PowerPoint generation..."

    if (-not (Test-Path $ICONS_EXTRACT_DIR)) {
        Get-AzureIconsArchive
        Expand-AzureIconsArchive
    }

    Get-PlotanceExecutable

    Write-Output "Scanning icons in $ICONS_EXTRACT_DIR..."
    $categories = Get-IconsByCategory $ICONS_EXTRACT_DIR

    if ($categories.Count -eq 0) {
        Write-Error "No icon categories found"
        exit 1
    }

    Write-Output "Found $($categories.Count) categories:"

    foreach ($categoryName in ($categories.Keys | Sort-Object)) {
        $capitalizedCategory = Get-CapitalizedCategory $categoryName
        Write-Output "  $capitalizedCategory`: $($categories[$categoryName].Count) icons"
    }

    $markdownFile = "$OUTPUT_NAME.md"
    Write-Output "`nGenerating Markdown file: $markdownFile"

    New-MarkdownContent `
      -Categories $categories `
      -Rows $GridRows `
      -Columns $GridColumns `
      -Height $IconHeight `
      | Out-File -FilePath $markdownFile -Encoding UTF8

    Write-Output "Markdown file generated successfully"

    $plotanceExecutable = if ($IsWindows) {
        ".\plotance.exe"
    }
    else {
        "./plotance"
    }
    New-PowerPointPresentation `
      -MarkdownFile $markdownFile `
      -PlotanceExecutable $plotanceExecutable

    Write-Output "`nAzure Icons PowerPoint generation completed!"
}

Main
