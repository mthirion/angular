import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpResponse, HttpClient, HttpHandler, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
	
	title = 'myapp';

	// variables for the API
	username = 'admin';
	password = 'admin';

	// using the nodejs proxy configured in src/proxy.conf.json that redirects to http://amqbrokerA.mycompany.com:8161/console/auth/login
	login_url = 'http://amqbrokerA.mycompany.com:4200/lg';
	login_data = '{"username": "'+this.username+'", "password": "'+this.password+'"}';

	url = 'http://amqbrokerA.mycompany.com:8161/console/jolokia?maxDepth=7&maxCollectionSize=50000&ignoreErrors=true&canonicalNaming=false';
	headers = new HttpHeaders({ 'Content-Type': 'text/plain' });
	options = { headers: this.headers, withCredentials: true };


	// Variables for the display
	queuelist = [];
	msgcountlist: string[] = [];
	messagelist = [];
	msgIsSelected = [];
	isSelectAll = false;

	// Model variables
	public replay_content = [];
	public replay_destination = [];


	// routing display
	queues = true;
	messages = false;

	constructor(private http:HttpClient, private cdr: ChangeDetectorRef) {
    	}

	ngOnInit() {
		console.log("login in");
		
		this.http.post(this.login_url, this.login_data, this.options)
		.subscribe(resp => { 
			console.debug("login data: " + JSON.stringify(resp)); 

			console.log("Retrieving queue names...");
			let qlist = '{ "type":"read","mbean":"org.apache.activemq.artemis:broker=\\"aprr\\"", "attribute":"QueueNames","config":{} }';
			console.debug("queue list raw request data: " + qlist);
			this.http.post(this.url, qlist, this.options)
			.subscribe(resp_qlist => { 
				console.debug("queue list raw response: " + JSON.stringify(resp_qlist));
				let data = JSON.parse(JSON.stringify(resp_qlist));
				this.queuelist = data.value;
				console.debug("extracted queue list from response: " + JSON.stringify(this.queuelist));

				this.queuelist.forEach(element => {
				
					console.debug("found queue name : " + element);
					let msgcount = '{ "type": "read", "mbean":"org.apache.activemq.artemis:broker=\\"aprr\\",component=addresses,address=\\"'+element+'\\",subcomponent=queues,routing-type=\\"anycast\\",queue=\\"'+element+'\\"", "attribute": "MessageCount", "config": {} }';
					console.debug("message count raw request = " + msgcount);
					this.http.post(this.url, msgcount, this.options)
					.subscribe(resp_msgc => {
						console.debug ("message count response raw = " + JSON.stringify(resp_msgc));
						let msgc = JSON.parse(JSON.stringify(resp_msgc));
						console.debug("found message count : " + msgc.value);
						this.msgcountlist.push(msgc.value);
					})	
				});
				
			} );
    		});
	}

       getMessages(q :string) {
       		let rmessages = '{ "type":"exec","mbean":"org.apache.activemq.artemis:broker=\\"aprr\\",component=addresses,address=\\"'+q+'\\",subcomponent=queues,routing-type=\\"anycast\\",queue=\\"'+q+'\\"","operation": "browse()","config":{} }';
		console.debug("message list raw request: " + rmessages);
                 this.http.post(this.url, rmessages, this.options)
                 .subscribe(resp_msg => {
		 	console.debug ("messages list raw response : " + JSON.stringify(resp_msg));
                        let messages = JSON.parse(JSON.stringify(resp_msg));
			this.messagelist=messages.value;
			this.newDisplay("messages");
                 });
	}

	newDisplay(target: string) {
		if (target == "queues")   {this.messages = false; this.queues=true;}
		if (target == "messages") {this.messages = true; this.queues=false;
					   if (this.msgIsSelected.length != this.messagelist.length) this.msgIsSelected = new Array(this.messagelist.length);
					  }
		this.cdr.detectChanges();
	}

	sendMessage(index){
		console.debug("index = " + index);
		let txt = this.messagelist[index].text;
		console.debug("new text = " + txt);
		
		// arguments: map of JMS headers , message type (3=text), body, durable (bool), user, pswd
		let args = '[{},3,"'+this.messagelist[index].text+'",true,"'+this.username+'","'+this.password+'"]';
       		let smsg = '{ "type":"exec","mbean":"org.apache.activemq.artemis:broker=\\"aprr\\",component=addresses,address=\\"'+this.messagelist[index].address+'\\",subcomponent=queues,routing-type=\\"anycast\\",queue=\\"'+this.messagelist[index].address+'\\"","operation": "sendMessage(java.util.Map, int, java.lang.String, boolean, java.lang.String, java.lang.String)","arguments": '+args+',"config":{} }';
		console.debug("replay message raw request: " + smsg);

		/*
	       	this.http.post(this.url, smsg, this.options)
		.subscribe( (resp_msg: HttpResponse<any>) => {
			// remove resent message
			if (resp_msg.status === 200) {
		 		console.debug ("replay message raw response : " + JSON.stringify(resp_msg.body));
				let rm_req = '{"type":"exec","mbean":"org.apache.activemq.artemis:broker=\\"aprr\\",component=addresses,address=\\"'+this.messagelist[index].address+'\\",subcomponent=queues,routing-type=\\"anycast\\",queue=\\"'+this.messagelist[index].address+'\\"","operation":"removeMessage(long)","arguments":["'+this.messagelist[index].messageID+'"]}';
				console.debug("message deletion raw request :" + rm_req);
				this.http.post(this.url, rm_req, this.options)
                 		.subscribe(rm_resp => {
					console.log("message "+ this.messagelist[index].messageID + " deleted");
					window.location.reload();
				});	
			} else console.log("error replyaing message");
		});
		*/
		
	}

	sendAllMessage() {
		for (var j=0; j < this.msgIsSelected.length; j++) this.sendMessage(j)
		
	}
	
	checkUncheckAll(){
		for (var i = 0; i < this.msgIsSelected.length; i++) {
			if (this.isSelectAll === true) this.msgIsSelected[i]=false;
			else 				this.msgIsSelected[i]=true;
		}				
		console.log("clicked = " + JSON.stringify(this.msgIsSelected));
		this.newDisplay("messages");
	}
}
