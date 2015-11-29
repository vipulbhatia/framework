var express = require('express'),
	ws = require('ws').Server,
	wss = new ws({port: 8003}),
	net = require('net'),
	bodyParser = require('body-parser'),
	fs = require('fs'),
	app = express(),
	agents = [],
	clients = [],
	client_router = {},
	agent_router = {},
	client_tokens = [],
	agent_tokens = [];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use('/', express.static(__dirname + '/public'));

app.get('/', function(req, res){
	res.writeHead(200);
	res.sendfile('index.html');
	res.end();
});

app.post('/api', function(req, res){
	var token;
	console.log(req.body);
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	if(client_tokens.length == 0) {
		clients.push(res);
		token = clients.indexOf(res);
	} else {
		token = client_tokens.shift();
		clients[token] = res;
	}

	if(match = /^connect\s+(.*)$/.exec(req.body.command) !== null) {
		for(var i in agents) {
			if(1 == 1) {
				var cli = {};
				cli.token = token;
				cli.command = req.body.command;
				agents[0].write(JSON.stringify(cli));
				return;
			}
		}
		return;
	}

	if(client_router[token] != null) {
		console.log("routing to agent: " + token);
		client_router[token].write(JSON.stringify(cli));
		return;
	}

	var cli = {};
	cli.token = token;
	cli.command = req.body.command;
	agents[0].write(JSON.stringify(cli));
	console.log('got command: ' + req.body.command);
	//resp.writeHead(200, {'Content-Type':'text/plain'});
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	/*resp.writeHead('Connection', 'Transfer-Encoding');
    resp.writeHead('Content-Type', 'text/html; charset=utf-8');
    resp.writeHead('Transfer-Encoding', 'chunked');
	var rstream = fs.createReadStream('c:\\dden\\DDEN_CSV.csv');
	rstream.pipe(resp);
	rstream.on('data', function(chunk){
		resp.write(chunk);
		console.log('got chunk...');
	});
	rstream.on('end', function(){
		resp.end();
	});*/
	/*var client = net.connect({port: 8001, host: 'localhost'}, function(){
		console.log('connected to agent....sending command...');
		client.write(req.body.command);
	});

	client.on('data', function(d){
		res.data += d;
	});

	client.on('end', function(){
		console.log('connection ended...');
		res.write(res.data);
		res.end();
	});*/
});

app.listen(8000, function(){
	console.log('listening on port 8000...');
});

//webagent server on port 8003
wss.on('connection', function(ws) {
	if(client_tokens.length == 0) {
		clients.push(ws);
		token = clients.indexOf(ws);
		console.log('got token: ' + token);
	} else {
		token = client_tokens.shift();
		clients[token] = ws;
	}
	
	ws.on('message', function(d){
		d = d.toString();
		var match = /^(.*)$/m.exec(d);
		if(match != null) d = match[1];
		console.log('ws: got command: ' + d);
		var cli = {};
		cli.token = token;
		cli.command = d;
		
		if(d == 'close') {
			console.log('ws: got close...');
			ws.end('bye');
			clean_up_client(token);
			return;
		}

		if(client_router[token] != null) {
			console.log("routing to agent: " + token);
			agents[client_router[token]].write(JSON.stringify(cli));
			return;
		}

		if(/^connect\s+(.*)$/.test(d)) {
			var match = /^connect\s+(.*)$/.exec(d);
			agents[match[1]].write(JSON.stringify(cli));
			return;
		}

		//broadcast
		for(var i in agents) {
			console.log('broadcasting to all agents...');
			agents[i].write(JSON.stringify(cli));
		}
	});

	ws.on('close', function(){
		console.log('ws: client dropped...');
	});

	ws.on('error', function(err){
		console.log('ws: client dropped due to error...');
	});
});

net.createServer(function(agent){
	var token;
	//agents.push(agent);
	console.log('agent connected: ' + agent.remoteAddress);
	if(agent_tokens.length == 0) {
		agents.push(agent);
		token = agents.indexOf(agent);
		console.log('got token: ' + token);
	} else {
		token = agent_tokens.shift();
		agents[token] = agent;
	}
	agent.on('data', function(d){
		d = d.toString();
		console.log(d);
		/*for(var i in client_router) {
			if(client_router[i] == agent) {
				console.log('sending to client agent...');
				if(typeof clients[i].write != "undefined") clients[i].write('hola');
				else clients[i].send(d);
				return;
			}
		}*/
		if(agent_router[token]) {
			var i = agent_router[token];
			console.log('sending to client agent...' + i);
			if(typeof clients[i].write != "undefined") clients[i].write(d);
			else clients[i].send(d);
			return;
		}

		if(/^connection for token (\d+)$/.test(d)) {
			var match = /^connection for token (\d+)$/.exec(d);
			client_router[match[1]] = token;
			agent_router[token] = match[1];
			//agent.pipe(clients[match[1]]);
			return;
		}

		if(/^token:(\d):zzz$/.test(d)){
			var match = /^token:(\d):zzz$/.exec(d);
			console.log('token here: ' + clients[match[1]]);
			//clients[match[1]].end();
			delete clients[match[1]];
			client_tokens.push(match[1]);
		} else {
			/*while(var match = /token:(\d):([^]*)/.exec(d)) {
				if(/token:(\d):([^]*)/.test(match[2])) {
					continue;
				} else {
					clients[match[1]].write(match[2]);
				}
			}*/
			
			var match = /([^]*)token:(\d):([^]*)$/.exec(d);
			//console.log(clients[match[2]]);
			//var match = /^token:(\d):([\n|\r|\S\s]*)$/.exec(d);
			if(match != null && match[2] != null) clients[match[2]].write(match[3]);
			while(match = /([^]*)token:(\d):([^]*)$/.exec(match[1]) !== null) {
				if(match[2] != null) clients[match[2]].write(match[3]);
			} 
			//clients[match[1]].write(match[2].replace(/token:(\d):/g,''));
		}	
	});

	agent.on('close', function(){
		console.log('got command: ' + agent.data);
		console.log('connection closed...');
		clean_up_agent(token);
	});

}).listen(8001);

net.createServer(function(client){
	var token;
	console.log('client connected: ' + client.remoteAddress);
	if(client_tokens.length == 0) {
		clients.push(client);
		token = clients.indexOf(client);
		console.log('got token: ' + token);
	} else {
		token = client_tokens.shift();
		clients[token] = client;
	}
	
	client.on('data', function(d){
		d = d.toString();
		var match = /^(.*)$/m.exec(d);
		if(match != null) d = match[1];
		console.log('client: got command: ' + d);
		if(d == 'close') {
			console.log('client: got close...');
			client.end('bye');
			clean_up_client(token);
			return;
		}

		if(d == 'show agents') {
			console.log('showing all connected agents...');
			for(var i in agents) {
				if(agent_router[i] == null) client.write(i + ') ' + agents[i].remoteAddress + '\n');
			}
			return;
		}

		var cli = {};
		cli.token = token;
		cli.command = d;

		if(client_router[token] != null) {
			console.log("routing to agent: " + token);
			agents[client_router[token]].write(JSON.stringify(cli));
			return;
		}

		if(/^connect\s+(.*)$/.test(d)) {
			var match = /^connect\s+(.*)$/.exec(d);
			agents[match[1]].write(JSON.stringify(cli));
			return;
		}

		//broadcast
		for(var i in agents) {
			console.log('broadcasting to all agents...');
			agents[i].write(JSON.stringify(cli));
		}
	});

	client.on('close', function(){
		console.log('client: client dropped...');
		clean_up_client(token);
	});

	client.on('error', function(err){
		console.log('client: client dropped due to error...');
		clean_up_client(token);
	});

}).listen(8002);

var clean_up_client = function(token) {
	if(clients[token]) {
			delete clients[token];
			client_tokens.push(token);
		}
	if(client_router[token]) {
		delete client_router[token];
	}
	for(var i in agent_router) {
		if(agent_router[i] == token) {
			console.log('client_token: ' + token);
			console.log('agent_token: ' + i);
			agents[i].write('{"token":"' + token + '","command":"close"}');
			//agents[i].end();
			delete agents[i];
			agent_tokens.push(i);
			delete agent_router[i];
		}
	}
}

var clean_up_agent = function(token) {
	if(agents[token]) {
			delete agents[token];
			agent_tokens.push(token);
		}
	if(agent_router[token]) {
		delete agent_router[token];
	}
	for(var i in client_router) {
		if(client_router[i] == token) {
			console.log('agent_token: ' + token);
			console.log('client_token: ' + i);
			//clients[i].write('{"token":"' + token + '","command":"close"}');
			clients[i].end('bye');
			delete clients[i];
			client_tokens.push(i);
			delete client_router[i];
		}
	}
}