- Azure PowerShell Function

  - Enable CORS

- Azure Function comes with storage account
  - Add container called `strava`
  - Add file called `strava.json`
  - Enable CORS
  - Add account level SAS with only Blob | Read, Write and use 'Blob service SAS URL'

Upload the strava token to `strava.json` in the format of:

```
access_token: "504d1ffc24e01c218a3e08272201eb1ef1e720fd"
expires_at: 1587995060
expires_in: 21600
refresh_token: "0d0b91604caf4fa3ae4f425044c554756756a954"
token_type: "Bearer"
```
