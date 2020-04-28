using namespace System.Net

# Input bindings are passed in via param block.
param($Request, $TriggerMetadata)

Write-Host "Checking for token validity"

$blobStorageConnection = (ls env:APPSETTING_AzureWebJobsStorage).Value
$blobContext = New-AzStorageContext -ConnectionString $blobStorageConnection
$tempFile = "d:\local\strava.json"

Get-AzStorageBlobContent -Container "strava" -Blob "strava.json" -Context $blobContext -Destination $tempFile -Force
$stravaData = Get-Content -Raw -Path $tempFile | ConvertFrom-Json

Write-Host $stravaData

$now = [DateTimeOffset]::Now.ToUnixTimeSeconds()

$clientId = "44881"
$clientSecret = "de5330ef48503f576b745e9dd790dcf11fcc7b01"

if ($stravaData.expires_at -gt $now) {
    Write-Host 'Current token is valid, returning it for use'

    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
            StatusCode = 200
            Body       = $stravaData.access_token
        })
}
else {
    Write-Host 'Current token is expired, refreshing'

    $refreshToken = $stravaData.refresh_token;
    $renewal = Invoke-RestMethod -Uri "https://www.strava.com/api/v3/oauth/token?client_id=$clientId&client_secret=$clientSecret&grant_type=refresh_token&refresh_token=$refreshToken" -Method Post

    $accessToken = $renewal.access_token
    $expiresAt = $renewal.expires_at
    $refreshToken = $renewal.refresh_token

    $renewal | ConvertTo-Json | Out-File $tempFile 

    Write-Host 'Updating storage blob'
    Get-AzStorageBlob -Container "strava" -Blob "strava.json" -Context $blobContext | Set-AzStorageBlobContent -File $tempFile -Context $blobContext -Force

    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
            StatusCode = 200
            Body       = $renewal.access_token
        })
}


