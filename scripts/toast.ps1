Param(
  [string]$msg
)
[void] [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")
$objNotifyIcon = New-Object System.Windows.Forms.NotifyIcon
$objNotifyIcon.Icon = "$env:localappdata\rvplayer\VERSION\Installer\scripts\logo.ico"
$objNotifyIcon.BalloonTipIcon = "Info"
$objNotifyIcon.BalloonTipText = $msg
$objNotifyIcon.BalloonTipTitle = "Rise Player"
$objNotifyIcon.Visible = $True
$objNotifyIcon.ShowBalloonTip(5000)
