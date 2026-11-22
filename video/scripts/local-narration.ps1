param([string]$TextPath,[string]$OutputPath)
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Zira Desktop')
$speaker.Rate = 0
$speaker.Volume = 100
$speaker.SetOutputToWaveFile($OutputPath)
$speaker.Speak([System.IO.File]::ReadAllText($TextPath))
$speaker.Dispose()
