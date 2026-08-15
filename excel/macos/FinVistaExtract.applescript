on ChooseAndUpload(apiKey)
	try
		set theFiles to choose file with prompt "Select Screener screenshot(s) for FinVista" of type {"public.png", "public.jpeg", "public.webp"} with multiple selections allowed
	on error
		return "CANCELLED"
	end try

	set destDir to POSIX path of (path to downloads folder) & "FinVista/"
	do shell script "mkdir -p " & quoted form of destDir
	set destCsv to destDir & "extract.csv"

	set curlCmd to "/usr/bin/curl -sS --max-time 180 -X POST " & quoted form of "https://finvista-app-lemon.vercel.app/api/extract"
	set curlCmd to curlCmd & " -H " & quoted form of ("X-Api-Key: " & apiKey)
	set curlCmd to curlCmd & " -F " & quoted form of "format=csv"

	repeat with f in theFiles
		set posixPath to POSIX path of f
		set curlCmd to curlCmd & " -F " & quoted form of ("files=@" & posixPath)
	end repeat

	set curlCmd to curlCmd & " -o " & quoted form of destCsv & " -w %{http_code}"

	try
		set httpCode to do shell script curlCmd
	on error errMsg
		return "CURL_FAILED " & errMsg
	end try

	if httpCode is not "200" then
		return "HTTP_" & httpCode & " Response saved to " & destCsv
	end if

	try
		do shell script "open -a " & quoted form of "Microsoft Excel" & " " & quoted form of destCsv
	on error
		do shell script "open " & quoted form of destCsv
	end try

	return "OK " & destCsv
end ChooseAndUpload
