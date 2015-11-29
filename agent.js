var WinExe = require('winexe'),
	net = require('net'),
	spawn = require('child_process').spawn,
	on_death = require('death'),
	Tail = require('file-tail'),
	masterServer = 'localhost';

var agent = net.connect({port: 8001, host: masterServer}, function(){
		console.log('connected to master...');
	});

	agent.on('data', function(d){
		var data = JSON.parse(d);
		console.log('got command: ' + data.command);
		if(/^connect\s+(.*)$/.test(data.command)) {
			var match = /^connect\s+(.*)$/.exec(data.command);
			var child_1, child_2;
			var conn = net.connect({port: 8001, host: masterServer}, function(){
				console.log('created child connection back to master...');
				conn.write('connection for token ' + data.token);
				child_1 = spawn(process.env.comspec, { stdio: [ 'pipe', 'pipe', 'pipe' ] });
				console.log(child_1.pid);
				child_1.stdout.pipe(conn);
				child_1.stderr.pipe(conn);
				child_1.on('error', function(err){
					console.log(err);
				});
				child_1.on('close', function(err){
					console.log(err);
				});
			});
			
			/*on_death(function(sig, err){
				console.log('got signal: ' + sig);
				console.log(err);
			});*/
			conn.on('data', function(d){
				d = JSON.parse(d.toString());
				console.log('got command: ' + d.command);
				//d.command = "powershell \"" + d.command + "\"";
				console.log('after ');
				if(/^exit$/.test(d.command)) {
					console.log('sigint: ' + child_1.pid);
					//process.kill(child_1.pid);
					if(child_2 != null) {
						console.log('killing child_2:');
						child_2.kill('SIGINT');
						child_2 = null;
						conn.write('exiting child_2...');
					}
					else {
						//process.kill(match[1], 'SIGINT');
						console.log('killing child_1:');
						child_1.kill('SIGINT');
						child_1 = null;
						conn.write('exiting child_1...');
						//conn.end();
					}
					//child_1.stdin.resume();
					//child_1.send('\x03');
					//child_1.stdin.end();
				} 
				else if(/^close$/.test(d.command)) {
					console.log('sigint: ' + child_1.pid);
					//process.kill(child_1.pid);
					if(child_2 != null) {
						console.log('killing child_2:');
						child_2.kill('SIGINT');
						child_2 = null;
					}
					//process.kill(match[1], 'SIGINT');
					console.log('killing child_1:');
					conn.end('exit');
					child_1.kill('SIGINT');
					child_1 = null;
				} else {
					if(/^powershell/i.test(d.command)) {
						var match = /^powershell\s+"(.*)"$/.exec(d.command);
						child_2 = spawn("powershell", [match[1]], {stdio: ['pipe', 'pipe', 1]});
						child_2.stdin.end();
						console.log('spawning child_2 for powershell: ' + child_2.pid);
						child_2.stdout.on('data', function(chunk){
							console.log('child _2 got data: ' + chunk);
							conn.write(chunk);
						});
						child_2.on('error', function(err){
							console.log(err);
						});
						child_2.on('close', function(err){
							console.log(err);
						});
		
					} else if(/^watch\s+(.*)$/.test(d.command)) {
						var match = /^watch\s+(.*)$/.exec(d.command);
						tail = Tail.startTailing(match[1]);
			
						conn.write("watching file: " + match[1] + '\n\n');
						tail.on("line", function(data) {
						  console.log(data);
						  conn.write(data + '\n');
						});
						 
						tail.on("error", function(error) {
						  console.log('ERROR: ', error);
						});
							 
						tail.on("tailError", function(error) {
						  console.log('ERROR: ', error);
						});
					} else if(/^unwatch$/.test(d.command)) {
						console.log('stopping file watcher...');
						tail.stop();
						tail = null;
						child_1.stdin.write('cd\n');
					}
					else {
						console.log('running command: ' + d.command);
						//child_1.stdin.resume();
						child_1.stdin.write(d.command + '\n');
						//child_1.stdin.end();
					}
					//child_1.stdin.write(d.command + '\n');
				}
			});

			conn.on('end', function(){
				console.log('connection ended...');
			});
			conn.on('close', function(){
				console.log('connection closed...');
			});
			conn.on('error', function(){
				console.log('connection ended with error...');
			});
			return;
		}
		var child = spawn(process.env.comspec, ["/c", data.command]);
		console.log('after ');
		//child.pipe(agent);
		child.stdout.on('data', function(d){
			setTimeout(function(){
			d = d.toString();
			console.log('data: ' + 'token:' + data.token + ':' + d);
			agent.write('token:' + data.token + ':' + d);
			},100);
		});
		child.on('close', function(){
			console.log('close: ' + 'token:' + data.token + ':zzz');
			//agent.write('token:' + data.token + ':zzz');
		});
		child.on('error', function(err){
			console.log('error: ' + err);
		});
		child.stderr.on('data', function(d){
			console.log(d.toString());
			//agent.write(d);
		});
		// executes `pwd`
		/*child = exec(d, function (error, stdout, stderr) {
		agent.write(stdout);
		console.log(stdout);
		  if (error !== null) {
		    console.log('exec error: ' + error);
		  }
		});
		*/
	});

	agent.on('end', function(){
		console.log('connection ended...');
		res.write(res.data);
		res.end();
	});

/*net.createServer(function(socket){
	socket.data = "";

	socket.on('data', function(d){
		socket.data += d;
		console.log('got command: ' + socket.data);
		var winexe = new WinExe({
		    username: 'perotsystems\\bhatiav2',
		    password: 'Node#12345678',
		    host: 'mlm2.ps.net'
		});
 
		// Run command on remote host 
		winexe.run('cmd.exe /c ' + socket.data, function (err, stdout, stderr) {
		    console.log(stdout); 
		    socket.write(stdout);
		    socket.end();
		    delete socket;
		});
	});

	socket.on('close', function(){
		console.log('got command: ' + socket.data);
		console.log('connection closed...');
	});
}).listen(8001);
 
var winexe = new WinExe({
    username: 'perotsystems\\bhatiav2',
    password: 'Node#12345678',
    host: 'mlm2.ps.net'
});
 
// Run command on remote host 
winexe.run('cmd.exe /c ping 165.136.102.246', function (err, stdout, stderr) {
    console.log(stdout+err+stderr); 
});

winexe.run('cmd.exe /c ping 165.136.102.247', function (err, stdout, stderr) {
    console.log(stdout+err+stderr); 
});

winexe.run('cmd.exe /c ipconfig /all', function (err, stdout, stderr) {
    console.log(stdout+err+stderr); 
});
*/
console.log("waiting for callbacks");