$c = new-object system.net.WebClient
$hostname = "localhost"
$port = "9449"
$c.OpenRead("http://${hostname}:${port}/shutdown")
