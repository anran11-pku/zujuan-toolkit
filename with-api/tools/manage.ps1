param(
    [ValidateSet('Install','Login','Fetch','Check','Show','Stop','List')]
    [string]$Action = 'Install'
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$bundleRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimeDir = Join-Path $bundleRoot '.runtime'
$nodeVersion = '24.14.1'
$nodeFolder = Join-Path $runtimeDir ('node-v' + $nodeVersion + '-win-x64')
$nodeExe = Join-Path $nodeFolder 'node.exe'
$npmCli = Join-Path $nodeFolder 'node_modules\npm\bin\npm-cli.js'
$projectDir = Join-Path $bundleRoot 'project'
$appScript = Join-Path $PSScriptRoot 'app.cjs'

function Invoke-CheckedNode {
    param([string[]]$NodeArguments)
    & $nodeExe @NodeArguments
    if ($LASTEXITCODE -ne 0) { throw ('命令未完成，退出码：' + $LASTEXITCODE) }
}

function Install-Runtime {
    $machineArch = $env:PROCESSOR_ARCHITEW6432
    if (-not $machineArch) { $machineArch = $env:PROCESSOR_ARCHITECTURE }
    if ($machineArch -ne 'AMD64') { throw '此安装包支持 Windows 11 x64，请使用对应的电脑。' }
    if ((Test-Path -LiteralPath $nodeExe) -and (Test-Path -LiteralPath $npmCli)) {
        $installed = & $nodeExe --version
        if ($LASTEXITCODE -eq 0 -and $installed -eq ('v' + $nodeVersion)) { return }
    }
    New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
    $zipName = 'node-v' + $nodeVersion + '-win-x64.zip'
    $zipPath = Join-Path $runtimeDir $zipName
    $expectedHash = '6e50ce5498c0cebc20fd39ab3ff5df836ed2f8a31aa093cecad8497cff126d70'
    $ready = (Test-Path -LiteralPath $zipPath) -and ((Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash -eq $expectedHash)
    if (-not $ready) {
        Write-Host '正在下载运行环境，请保持联网……'
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -UseBasicParsing -Uri ('https://nodejs.org/dist/v' + $nodeVersion + '/' + $zipName) -OutFile $zipPath -TimeoutSec 300
    }
    if ((Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash -ne $expectedHash) {
        throw '运行环境下载校验失败，请重新运行安装。'
    }
    Expand-Archive -LiteralPath $zipPath -DestinationPath $runtimeDir -Force
    if (-not (Test-Path -LiteralPath $nodeExe)) { throw '运行环境解压失败。' }
}

try {
    Set-Location -LiteralPath $bundleRoot
    $env:ZUJUAN_DATA_DIR = Join-Path $bundleRoot 'data'
    $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $runtimeDir 'browsers'
    if ($Action -eq 'Install') {
        Install-Runtime
        $env:PATH = $nodeFolder + ';' + $env:PATH
        New-Item -ItemType Directory -Path $env:ZUJUAN_DATA_DIR -Force | Out-Null
        Write-Host '正在安装项目依赖……'
        Push-Location -LiteralPath $projectDir
        try {
            Invoke-CheckedNode -NodeArguments @($npmCli,'ci','--no-fund','--no-audit')
            Invoke-CheckedNode -NodeArguments @($npmCli,'run','build')
        } finally { Pop-Location }
        & $nodeExe $appScript prepare
        $prepareCode = $LASTEXITCODE
        if ($prepareCode -eq 2) {
            Write-Host '没有检测到可用浏览器，正在下载专用浏览器……'
            Invoke-CheckedNode -NodeArguments @((Join-Path $projectDir 'node_modules\playwright\cli.js'),'install','chromium','--no-shell')
            Invoke-CheckedNode -NodeArguments @($appScript,'prepare')
        } elseif ($prepareCode -ne 0) { throw '浏览器配置失败。' }
        Invoke-CheckedNode -NodeArguments @($appScript,'check')
        Write-Host '安装完成。请关闭此窗口，再双击“2-登录组卷网.cmd”。' -ForegroundColor Green
    } else {
        if (-not (Test-Path -LiteralPath $nodeExe) -or -not (Test-Path -LiteralPath (Join-Path $projectDir 'dist\index.js'))) {
            throw '请先双击“1-一键安装.cmd”，安装完成后再使用。'
        }
        $env:PATH = $nodeFolder + ';' + $env:PATH
        switch ($Action) {
            'List' {
                $keyword = Read-Host '输入要查找的知识点关键词，例如 三角形'
                if ([string]::IsNullOrWhiteSpace($keyword)) { throw '关键词不能为空。' }
                $grade = Read-Host '选择学段：1=初中，2=高中，直接回车为初中'
                if ($grade -and $grade -notin @('1','2')) { throw '学段只能输入1或2。' }
                $listArgs = @($appScript,'list','--search',$keyword,'--depth','-1')
                if ($grade -ne '2') { $listArgs += '--middle' }
                Invoke-CheckedNode -NodeArguments $listArgs
            }
            'Show' {
                $target = & $nodeExe $appScript latest
                if ($LASTEXITCODE -ne 0) { throw '暂时没有可查看的结果，请先抓题。' }
                Start-Process -FilePath ($target | Select-Object -Last 1)
            }
            default { Invoke-CheckedNode -NodeArguments @($appScript,$Action.ToLowerInvariant()) }
        }
    }
    exit 0
} catch {
    Write-Host ('操作未完成：' + $_.Exception.Message) -ForegroundColor Red
    Write-Host '如果是下载或连接错误，请检查网络后重试。其他问题请保留窗口中的错误信息。'
    exit 1
}
