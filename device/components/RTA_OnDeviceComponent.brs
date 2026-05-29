sub init()
	RTA_logInfo("OnDeviceComponent init")
	m.task = m.top.createChild("RTA_OnDeviceComponentTask")
	m.task.observeFieldScoped("renderThreadRequest", "onRenderThreadRequestChange")
	m.task.control = "RUN"
	m.validRequestTypes = {
		"assignElementIdOnAllNodes": processAssignElementIdOnAllNodesRequest
		"callFunc": processCallFuncRequest
		"callFunc": processCallFuncRequest
		"cancelRequest": processCancelRequest
		"createChild": processCreateChildRequest
		"disableScreenSaver": processDisableScreenSaverRequest
		"focusNode": processFocusNodeRequest
		"getAllCount": processGetAllCountRequest
		"getFocusedNode": processGetFocusedNodeRequest
		"getChildrenByElementId": processGetChildrenByElementIdRequest
		"getNodesInfo": processGetNodesInfoRequest
		"getNodesWithProperties": processGetNodesWithPropertiesRequest
		"getRootsCount": processGetRootsCountRequest
		"getValue": processGetValueRequest
		"getValues": processGetValuesRequest
		"hasFocus": processHasFocusRequest
		"isInFocusChain": processIsInFocusChainRequest
		"isShowingOnScreen": processIsShowingOnScreenRequest
		"isSubtype": processIsSubtypeRequest
		"onFieldChange": processOnFieldChangeRequest
		"removeNode": processRemoveNodeRequest
		"removeNodeChildren": processRemoveNodeChildrenRequest
		"setSettings": processSetSettingsRequest
		"setValue": processSetValueRequest
	}

	m.activeRequests = {}

	m.currentElementId = 0
end sub

sub onRenderThreadRequestChange(event as Object)
	request = event.getData()

	' Don't want to take the overhead if we are not logging debug
	if RTA_canLog("debug") then
		json = formatJson(request)
		length = json.len()
		if length > 1000 then
			json = "large request showing first 1000 characters (" + length.toStr() + " total) of  json: " + json.left(1000) + "..."
		end if

		RTA_logDebug("Received request: ", json)
	end if

	requestType = request.type
	request.timespan = createObject("roTimespan")

	func = m.validRequestTypes[requestType]
	if func <> invalid then
		response = func(request)
	else
		response = RTA_buildErrorResponseObject("Request type '" + requestType + "' not handled in this version")
	end if

	if response <> Invalid then
		sendResponseToTask(request, response)
	end if
end sub

function processCallFuncRequest(request as Object) as Object
	args = request.args
	result = processGetValueRequest(args)
	if RTA_isErrorObject(result) then
		return result
	end if

	node = result.value
	if NOT RTA_isNode(node) then
		keyPath = RTA_getStringAtKeyPath(args, "keyPath")
		return RTA_buildErrorResponseObject("Node not found at key path '" + keyPath + "'")
	end if

	funcName = args.funcName
	if NOT RTA_isNonEmptyString(funcName) then
		return RTA_buildErrorResponseObject("CallFunc request did not have valid 'funcName' param passed in")
	end if

	p = args.funcParams
	if p = Invalid then p = []

	paramsCount = p.count()

	if paramsCount = 0 then
		' callFunc could fail on certain devices in the past if no param was passed. Leaving this up to the user of library as of 2.0 release
		result = node.callFunc(funcName)
	else if paramsCount = 1 then
		result = node.callFunc(funcName, p[0])
	else if paramsCount = 2 then
		result = node.callFunc(funcName, p[0], p[1])
	else if paramsCount = 3 then
		result = node.callFunc(funcName, p[0], p[1], p[2])
	else if paramsCount = 4 then
		result = node.callFunc(funcName, p[0], p[1], p[2], p[3])
	else if paramsCount = 5 then
		result = node.callFunc(funcName, p[0], p[1], p[2], p[3], p[4])
	else if paramsCount = 6 then
		result = node.callFunc(funcName, p[0], p[1], p[2], p[3], p[4], p[5])
	else if paramsCount = 7 then
		result = node.callFunc(funcName, p[0], p[1], p[2], p[3], p[4], p[5], p[6])
	end if

	return {
		"value": result
	}
end function

function processGetFocusedNodeRequest(request as Object) as Object
	args = request.args
	focusedNode = RTA_getFocusedNode()
	result = {
		"node": focusedNode
	}

	node = focusedNode
	parent = node.getParent()
	keyPathParts = []

	while parent <> invalid
		nodeId = node.id
		if nodeId <> "" then
			keyPathParts.unshift("#" + nodeId)
		else
			keyPathParts.unshift(RTA_getNodeParentIndex(node, parent).toStr())
		end if

		node = parent
		parent = node.getParent()
	end while
	result["keyPath"] = keyPathParts.join(".")

	if NOT RTA_getBooleanAtKeyPath(args, "includeNode", true) then
		result.delete("node")
	end if

	return result
end function

function processGetValueRequest(request as Object) as Object
	if request.args = Invalid then
		' Allows us to use this same functionality in other requests
		args = request
	else
		args = request.args
	end if

	base = getBaseObject(args)
	if RTA_isErrorObject(base) then
		return base
	end if

	keyPath = RTA_getStringAtKeyPath(args, "keyPath")
	if RTA_isNonEmptyString(args.field) then
		if keyPath = "" then
			keyPath = args.field
		else
			keyPath += "." + args.field
		end if
	end if


	if RTA_isNonEmptyString(keyPath) then
		value = RTA_getValueAtKeyPath(base, keyPath, "[[VALUE_NOT_FOUND]]")
		found = NOT RTA_isString(value) OR value <> "[[VALUE_NOT_FOUND]]"
	else
		value = base
		found = true
	end if

	result = {
		"found": found
	}

	if found then
		result.value = value
	end if

	return result
end function

function processGetValuesRequest(request as Object) as Object
	args = request.args
	requests = args.requests
	if NOT RTA_isNonEmptyAA(requests) then
		return RTA_buildErrorResponseObject("getValues did not have have any requests")
	end if
	results = {}
	for each key in requests
		' TODO handle children here
		result = processGetValueRequest(requests[key])
		if RTA_isErrorObject(result) then
			return result
		end if
		results[key] = result
	end for
	return {
		"results": results
	}
end function

function processGetNodesInfoRequest(request as Object) as Object
	args = request.args
	requests = args.requests
	if NOT RTA_isNonEmptyAA(requests) then
		return RTA_buildErrorResponseObject("getNodesInfo did not have have any requests")
	end if

	results = {}
	for each key in requests
		requestArgs = requests[key]
		result = processGetValueRequest(requestArgs)
		if RTA_isErrorObject(result) then
			return result
		end if

		node = result.value
		if NOT result.found OR NOT RTA_isNode(node) then
			return RTA_buildErrorResponseObject("Node not found at keypath '" + requestArgs.keyPath + "'")
		end if

		fields = {}
		fieldTypes = node.getFieldTypes()
		for each fieldKey in fieldTypes
			value = node[fieldKey]
			fields[fieldKey] = {
				"fieldType": fieldTypes[fieldKey]
				"type": type(value)
				"value": value
			}
		end for

		children = []
		for each child in node.getChildren(-1, 0)
			children.push({
				"subtype": child.subtype()
			})
		end for

		results[key] = {
			"subtype": node.subtype()
			"fields": fields
			"children": children
		}
	end for

	return {
		"results": results
	}
end function

function processGetChildrenByElementIdRequest(request as Object) as Object
	args = request.args
	elementIds = args.requests
	if NOT RTA_isNonEmptyArray(elementIds) then
		return RTA_buildErrorResponseObject("getChildrenByElementId requires a non-empty requests array of elementIds")
	end if

	allNodes = m.top.getAll()

	results = {}
	for each elementId in elementIds
		foundNode = invalid
		for each node in allNodes
			if node.getUIElementId() = elementId then
				foundNode = node
				exit for
			end if
		end for

		children = []
		if foundNode <> invalid then
			for each child in foundNode.getChildren(-1, 0)
				children.push({
					"subtype": child.subtype()
					"id": child.id
					"uiElementId": child.getUIElementId()
				})
			end for
		end if
		results[elementId] = children
	end for

	return {
		"results": results
	}
end function

function processHasFocusRequest(request as Object) as Object
	args = request.args
	result = processGetValueRequest(args)
	if RTA_isErrorObject(result) then
		return result
	end if

	if result.found <> true then
		return RTA_buildErrorResponseObject("No value found at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "'")
	end if

	node = result.value
	if NOT RTA_isNode(node) then
		return RTA_buildErrorResponseObject("Value at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "' was not a node")
	end if

	return {
		"hasFocus": node.hasFocus()
	}
end function

function processIsInFocusChainRequest(request as Object) as Object
	args = request.args
	result = processGetValueRequest(args)
	if RTA_isErrorObject(result) then
		return result
	end if

	if result.found <> true then
		return RTA_buildErrorResponseObject("No value found at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "'")
	end if

	node = result.value
	if NOT RTA_isNode(node) then
		return RTA_buildErrorResponseObject("Value at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "' was not a node")
	end if

	return {
		"isInFocusChain": node.isInFocusChain()
	}
end function

function processOnFieldChangeRequest(request as Object) as Dynamic
	args = request.args
	requestId = request.id

	m.activeRequests[requestId] = request

	' We have to exclude the field from the args so we can get the parent node
	getValueArgs = {}
	getValueArgs.append(args)
	getValueArgs.field = invalid

	result = processGetValueRequest(getValueArgs)
	if RTA_isErrorObject(result) then
		return result
	end if

	node = result.value
	field = args.field

	parentRTA_isNode = RTA_isNode(node)
	fieldExists = parentRTA_isNode AND node.doesExist(field)
	timePassed = 0

	' If node doesn't exist or field doesn't exist we set a timer to retry after a delay
	if NOT parentRTA_isNode OR NOT fieldExists then
		retryTimeout = args.retryTimeout
		if retryTimeout > 0 then
			request.id = request.id
			requestContext = request.context
			if requestContext = Invalid then
				timer = createObject("roSGNode", "Timer")
				timer.duration = args.retryInterval / 1000
				timer.id = requestId
				timer.observeFieldScoped("fire", "onProcessOnFieldChangeRequestRetryFired")
				timer.control = "start"

				requestContext = {
					"timer": timer
					"timespan": createObject("roTimespan")
				}
				request.context = requestContext

				return Invalid
			else
				timePassed = requestContext.timespan.totalMilliseconds()
				if timePassed < retryTimeout then
					timer = requestContext.timer
					if timePassed + args.retryInterval > retryTimeout then
						timer.duration = (retryTimeout - timePassed) / 1000
					end if
					timer.control = "start"
					return Invalid
				end if
			end if
		end if

		if NOT parentRTA_isNode then
			errorMessage = "Node not found at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "'"
		else
			errorMessage = "Node did not have field named '" + field + "' at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "'"
		end if

		if timePassed > 0 then
			errorMessage += " timed out after " + timePassed.toStr() + "ms"
		end if

		RTA_logWarn(errorMessage)

		m.activeRequests.delete(requestId)

		sendResponseToTask(request, RTA_buildErrorResponseObject(errorMessage))

		' Might be called asynchronously, and we already handled this, so return Invalid
		return Invalid
	end if



	' Set by reference in activeRequests request AA
	request.node = node

	' Only want to observe if we weren't already observing this node field
	alreadyObserving = false
	for each requestId in m.activeRequests
		existingRequest = m.activeRequests[requestId]
		if request.type = "onFieldChange" then
			if node.isSameNode(existingRequest.node) AND existingRequest.args.field = field AND requestId <> request.id then
				RTA_logDebug("Already observing '" + field + "' at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "'")
				alreadyObserving = true
				exit for
			end if
		end if
	end for

	if NOT alreadyObserving then
		if node.observeFieldScoped(field, "observeFieldCallback") then
			RTA_logDebug("Now observing '" + field + "' at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "'")
		else
			return RTA_buildErrorResponseObject("Could not observe field '" + field + "' at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "'")
		end if
	end if

	' If match was provided, check to see if it already matches the expected value
	match = args.match
	if RTA_isAA(match) then
		match.key = args.key
		result = processGetValueRequest(match)
		if RTA_isErrorObject(result) then
			return result
		end if

		' IMPROVEMENT hook into compareValues() functionality and eventually build out to support more complicated types
		if result.found AND result.value = match.value then
			' In this case our first response is actually an observer response
			return {
				"value": node[field]
				"observerFired": false
			}
		end if
	end if

	return RTA_buildSuccessResponseObject("Successfully set the observer!")
end function

Function processCancelRequest(request as Object) as Object
	args = request.args

	requestIdToCancel = RTA_getStringAtKeyPath(args, "id")
	request = m.activeRequests[requestIdToCancel]

	if request <> invalid then
		requestType = request.type
		if requestType = "onFieldChange" then
			conditionallyCleanObservers(request.node, request.args.field, requestIdToCancel)
			response = RTA_buildSuccessResponseObject("Observer removed")
		else
			response = RTA_buildErrorResponseObject("Request ID '" + requestIdToCancel + "' can not be canceled")
		end if

		if RTA_isErrorObject(response) = false then
			m.activeRequests.delete(requestIdToCancel)
		else
			RTA_logDebug("processCancelRequest: Error removing observer for request ID '" + requestIdToCancel + "'")
		end if

		return response
	end if


	return RTA_buildErrorResponseObject("Request ID '" + requestIdToCancel + "' not found")
End Function

' @param triggerRequestId - The requestId that triggered this cleanup. We need to exclude this requestId when checking if we can clean up the observer
sub conditionallyCleanObservers(node, field, triggerRequestId)
	if RTA_isNode(node) = false then
		RTA_logDebug("conditionallyCleanObservers node is not a node")
		return
	end if

	if RTA_isString(field) = false then
		RTA_logDebug("conditionallyCleanObservers field is not a string")
		return
	end if

	remainingObservers = 0
	for each requestId in m.activeRequests
		request = m.activeRequests[requestId]
		if request.type = "onFieldChange" then
			args = request.args
			if triggerRequestId <> requestId AND node.isSameNode(request.node) AND args.field = field then
				remainingObservers++
			end if
		end if
	end for

	if remainingObservers = 0 then
		' If we got to here then we sent back all responses for this field so we can remove our observer now
		RTA_logDebug("conditionallyCleanObservers: Unobserved '" + field + "' on " + node.subtype() + "(" + node.id + ")")
		node.unobserveFieldScoped(field)
	end if
end sub

sub onProcessOnFieldChangeRequestRetryFired(event as Object)
	requestId = event.getNode()
	request = m.activeRequests[requestId]
	response = processOnFieldChangeRequest(request)

	' If response isn't invalid then we have to send it back ourselves
	if response <> Invalid then
		sendResponseToTask(request, response)
	end if
end sub

sub observeFieldCallback(event as Object)
	node = event.getRoSgNode()
	field = event.getField()
	data = event.getData()
	RTA_logDebug("Received callback for node field '" + field + "' with value ", data)

	requestFound = false

	request = invalid
	for each requestId in m.activeRequests
		request = m.activeRequests[requestId]
		if request.type = "onFieldChange" then
			args = request.args
			if node.isSameNode(request.node) AND args.field = field then
				requestFound = true

				success = true
				RTA_logVerbose("Found matching requestId: " + requestId)
				match = args.match
				if RTA_isAA(match) then
					result = processGetValueRequest(match)
					if RTA_isErrorObject(result) then
						RTA_logVerbose("observeFieldCallback: Encountered error", result)
						sendResponseToTask(request, result)
						success = false
					end if

					if result.found = false OR result.value <> match.value then
						RTA_logVerbose("observeFieldCallback: Match.value did not match requested value continuing to wait", {
							"result": result.value
							"match": match.value
						})
						success = false
					end if
				end if

				if success then
					RTA_logVerbose("observeFieldCallback: Sending back response", data)
					sendResponseToTask(request, {
						"value": data
						"observerFired": true
					})
				end if
			end if
		end if
	end for

	if requestFound = false then
		RTA_logError("Received callback for unknown node or field ", node)
	end if
end sub

function processSetValueRequest(request as Object) as Object
	args = request.args

	' Need to call getBaseObject first as this will modify path for elementId based key paths
	base = getBaseObject(args)

	keyPath = RTA_getStringAtKeyPath(args, "keyPath")
	field = args.field
	if NOT RTA_isString(field) then
		return RTA_buildErrorResponseObject("Missing valid 'field' param")
	end if

	if RTA_isErrorObject(base) then
		return base
	end if
	nodeParent = Invalid

	if field = "" then
		result = processGetValueRequest(args)
		if RTA_isErrorObject(result) then
			return result
		end if
		nodeParent = result.value

		updateAA = args.value
		if NOT RTA_isAA(updateAA) then
			return RTA_buildErrorResponseObject("If field is empty, then value must be an AA")
		end if
	else
		' Have to walk up the tree until we get to a node as anything that is a field on a node must be replaced
		nodeParentKeyPathParts = keyPath.split(".")
		setKeyPathParts = []

		while NOT nodeParentKeyPathParts.isEmpty()
			nodeParent = RTA_getValueAtKeyPath(base, nodeParentKeyPathParts.join("."))
			if RTA_isNode(nodeParent) then
				exit while
			else
				setKeyPathParts.unshift(nodeParentKeyPathParts.pop())
			end if
		end while

		' If we got all the way to the top and still didn't have a node parent then we use the base as the node parent
		if NOT RTA_isNode(nodeParent) then
			nodeParent = base
		end if

		if setKeyPathParts.isEmpty() then
			updateAA = RTA_createCaseSensitiveAA(field, args.value)
		else
			setKeyPathParts.push(field)
			nodeFieldKey = setKeyPathParts.shift()
			nodeFieldValueCopy = nodeParent[nodeFieldKey]
			RTA_setValueAtKeyPath(nodeFieldValueCopy, setKeyPathParts.join("."), args.value)
			updateAA = RTA_createCaseSensitiveAA(nodeFieldKey, nodeFieldValueCopy)
		end if
	end if

	if NOT RTA_isNode(nodeParent) then
		nodeParent = base
	end if

	nodeParent.update(updateAA, true)
	return {}
end function

function processGetAllCountRequest(_request as Object) as Object
	return calculateNodeCount(m.top.getAll())
end function

function processGetRootsCountRequest(_request as Object) as Object
	return calculateNodeCount(m.top.getRoots())
end function

function calculateNodeCount(nodes) as Object
	result = {}
	nodeCountByType = {}

	result["totalNodes"] = nodes.count()
	result["nodeCountByType"] = nodeCountByType

	for each node in nodes
		nodeType = node.subtype()
		if nodeCountByType[nodeType] = Invalid then
			nodeCountByType[nodeType] = 0
		end if
		nodeCountByType[nodeType]++
	end for

	return result
end function

function processIsSubtypeRequest(request) as Object
	args = request.args

	subtype = args.subtype
	if NOT RTA_isString(subtype) then
		return RTA_buildErrorResponseObject("Missing valid 'subtype' param")
	end if

	result = processGetValueRequest(args)
	if RTA_isErrorObject(result) then
		return result
	end if

	if result.found <> true then
		return RTA_buildErrorResponseObject("No value found at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "'")
	end if

	node = result.value
	if NOT RTA_isNode(node) then
		return RTA_buildErrorResponseObject("Value at key path '" + RTA_getStringAtKeyPath(args, "keyPath") + "' was not a node")
	end if

	isSubtype = node.isSubtype(subtype)
	if NOT isSubtype AND RTA_getBooleanAtKeyPath(args, "matchOnSelfSubtype", true) then
		isSubtype = (node.subtype() = subtype)
	end if

	return {
		"isSubtype": isSubtype
	}
end function

function processAssignElementIdOnAllNodesRequest(request as Object) as Object
	args = request.args

	maintainExistingElementId = RTA_getBooleanAtKeyPath(args, "maintainExistingElementId", true)

	if maintainExistingElementId = false then
		m.currentElementId = 0
	end if

	result = {}

	allNodes = m.top.getAll()
	for each node in allNodes
		if maintainExistingElementId AND node.getUIElementId() <> "" then
			' Skipping as already stored
		else
			node.setUIElementId("RTA_" + m.currentElementId.toStr())
			m.currentElementId++
		end if
	end for

	return result
end function

function processGetNodesWithPropertiesRequest(request as Object) as Object
	args = request.args

	processAssignElementIdOnAllNodesRequest({ args: {} })

	allNodes = m.top.getAll()
	matchingNodes = []
	properties = args.properties
	for each node in allNodes
		nodeMatches = true
		for each property in properties
			result = doesNodeHaveProperty(node, property)
			if result = -1 then
				return RTA_buildErrorResponseObject("Invalid type for property " + formatJson(property))
			end if

			if result = 0 then
				nodeMatches = false
				exit for
			end if
		end for
		if nodeMatches then
			matchingNodes.push(node)
		end if
	end for

	return {
		"nodes": matchingNodes
	}
end function

function processDisableScreenSaverRequest(request as Object) as Object
	args = request.args
	if RTA_getBooleanAtKeyPath(args, "disableScreenSaver") then
		if m.videoNode = Invalid then
			m.videoNode = m.top.createChild("Video")
			m.videoNode.disableScreenSaver = true
		end if
	else
		if m.videoNode <> Invalid then
			m.top.removeChild(m.videoNode)
			m.videoNode = Invalid
		end if
	end if
	return {}
end function

function processFocusNodeRequest(request as Object) as Object
	args = request.args
	result = processGetValueRequest(args)
	if RTA_isErrorObject(result) then
		return result
	end if

	if result.found <> true then
		keyPath = RTA_getStringAtKeyPath(args, "keyPath")
		return RTA_buildErrorResponseObject("No value found at key path '" + keyPath + "'")
	end if

	node = result.value
	if NOT RTA_isNode(node) then
		keyPath = RTA_getStringAtKeyPath(args, "keyPath")
		return RTA_buildErrorResponseObject("Value at key path '" + keyPath + "' was not a node")
	end if

	node.setFocus(RTA_getBooleanAtKeyPath(args, "on", true))

	return {}
end function

function processCreateChildRequest(request as Object) as Object
	args = request.args
	result = processGetValueRequest(args)
	if RTA_isErrorObject(result) then
		return result
	end if

	if result.found <> true then
		keyPath = RTA_getStringAtKeyPath(args, "keyPath")
		return RTA_buildErrorResponseObject("No value found at key path '" + keyPath + "'")
	end if

	parent = result.value
	if NOT RTA_isNode(parent) then
		keyPath = RTA_getStringAtKeyPath(args, "keyPath")
		return RTA_buildErrorResponseObject("Value at key path '" + keyPath + "' was not a node")
	end if

	nodeSubtype = RTA_getStringAtKeyPath(args, "subtype")
	node = parent.createChild(nodeSubtype)
	if node <> Invalid then
		fields = args.fields
		if fields <> invalid then
			node.update(fields, true)
		end if
	else
		return RTA_buildErrorResponseObject("Failed to create " + nodeSubtype + " node")
	end if

	return {}
end function

function processRemoveNodeRequest(request as Object) as Object
	args = request.args
	result = processGetValueRequest(args)
	if RTA_isErrorObject(result) then
		return result
	end if

	if result.found <> true then
		keyPath = RTA_getStringAtKeyPath(args, "keyPath")
		return RTA_buildErrorResponseObject("No value found at key path '" + keyPath + "'")
	end if

	node = result.value
	if NOT RTA_isNode(node) then
		keyPath = RTA_getStringAtKeyPath(args, "keyPath")
		return RTA_buildErrorResponseObject("Value at key path '" + keyPath + "' was not a node")
	end if

	success = false
	parent = node.getParent()
	if parent <> Invalid then
		success = parent.removeChild(node)
		if NOT success then
			return RTA_buildErrorResponseObject("Failed to remove node")
		end if
	end if

	return {}
end function

function processRemoveNodeChildrenRequest(request as Object) as Object
	args = request.args
	result = processGetValueRequest(args)
	if RTA_isErrorObject(result) then
		return result
	end if

	if result.found <> true then
		keyPath = RTA_getStringAtKeyPath(args, "keyPath")
		return RTA_buildErrorResponseObject("No value found at key path '" + keyPath + "'")
	end if

	node = result.value
	if NOT RTA_isNode(node) then
		keyPath = RTA_getStringAtKeyPath(args, "keyPath")
		return RTA_buildErrorResponseObject("Value at key path '" + keyPath + "' was not a node")
	end if

	index = RTA_getNumberAtKeyPath(args, "index")
	count = RTA_getNumberAtKeyPath(args, "count", 1)

	if count = -1 then
		count = node.getChildCount()
	end if

	success = node.removeChildrenIndex(count, index)
	if NOT success then
		return RTA_buildErrorResponseObject("Failed to remove children")
	end if

	return {}
end function

function processIsShowingOnScreenRequest(request as Object) as Object
	args = request.args
	isShowing = true
	isFullyShowing = false

	result = processGetValueRequest(args)
	if RTA_isErrorObject(result) then
		return result
	end if

	node = result.value
	if NOT RTA_isNode(node) then
		keyPath = RTA_getStringAtKeyPath(args, "keyPath")
		return RTA_buildErrorResponseObject("Value at key path '" + keyPath + "' was not a node")
	end if

	parentNode = Invalid
	if node.visible = false OR node.opacity = 0 then
		isShowing = false
		isFullyShowing = false
	else
		rect = node.sceneBoundingRect()

		' Boundingrect is based off design resolution so need to use that to get the onscreen size
		if m.currentDesignResolution = invalid then
			m.currentDesignResolution = m.top.getScene().currentDesignResolution
		end if

		if rect.width = 0 OR rect.height = 0 then
			isShowing = false
		else if rect.x + rect.width < 0 OR rect.y + rect.height < 0 then
			isShowing = false
		else if rect.x > m.currentDesignResolution.width OR rect.y > m.currentDesignResolution.height then
			isShowing = false
		else
			parentNode = node

			if rect.x > 0 AND rect.x + rect.width <= m.currentDesignResolution.width AND rect.y > 0 AND rect.y + rect.height <= m.currentDesignResolution.height then
				isFullyShowing = true
			end if
		end if
	end if

	' Have to check parents for visibility and opacity
	while parentNode <> Invalid
		parentNode = node.getParent()
		if parentNode <> Invalid then
			node = parentNode
			if node.visible = false OR node.opacity = 0 then
				isShowing = false
				exit while
			end if
		end if
	end while

	return {
		"isShowing": isShowing
		"isFullyShowing": isFullyShowing
	}
end function

function processSetSettingsRequest(request as Object) as Object
	args = request.args
	setLogLevel(RTA_getStringAtKeyPath(args, "logLevel"))

	return {}
end function

' Returns 0 if no, 1 if yes and -1 if the comparison isn't possible on the current type
function doesNodeHaveProperty(node as Object, property as Object) as Integer
	result = 0
	operator = property.operator
	fields = property.fields
	if RTA_isArray(fields) then
		for each field in fields
			if node.hasField(field) then
				result = compareValues(operator, node[field], property.value)
				if result <> 0 then
					return result
				end if
			end if
		end for
	else if RTA_isArray(property.keyPaths) then
		for each keyPath in property.keyPaths
			' Route through keypath functionality to allow more advanced searches
			actualValue = RTA_getValueAtKeyPath(node, keyPath, "[[VALUE_NOT_FOUND]]")
			found = NOT RTA_isString(actualValue) OR actualValue <> "[[VALUE_NOT_FOUND]]"

			if found then
				result = compareValues(operator, actualValue, property.value)
				if result <> 0 then
					return result
				end if
			end if
		end for
	end if

	return 0
end function

' Returns 0 if no, 1 if yes and -1 if the comparison isn't possible on the current type
function compareValues(operator as String, a as Dynamic, b as Dynamic) as Integer
	result = 0
	if operator = "equal" then
		if a = b then
			return 1
		end if
	else if operator = "notEqual" then
		if a <> b then
			return 1
		end if
	else if operator = "greaterThan" OR operator = "greaterThanEqualTo" OR operator = "lessThan" OR operator = "lessThanEqualTo" then
		if RTA_isNumber(a) AND RTA_isNumber(b) then
			if operator = "greaterThan" then
				if a > b then
					return 1
				end if
			else if operator = "greaterThanEqualTo" then
				if a >= b then
					return 1
				end if
			else if operator = "lessThan" then
				if a < b then
					return 1
				end if
			else if operator = "lessThanEqualTo" then
				if a <= b then
					return 1
				end if
			end if
		else
			result = -1
		end if
	else if operator = "in" OR operator = "!in" then
		' Only string checking allowed for now
		if RTA_isString(a) AND RTA_isString(b) then
			found = a.instr(b) >= 0

			if operator = "in" AND found then
				return 1
			else if operator = "!in" AND NOT found then
				return 1
			end if
		else
			result = -1
		end if
	end if

	return result
end function

function getBaseObject(args as Object) as Dynamic
	baseType = RTA_getStringAtKeyPath(args, "base")
	if baseType = "global" then return m.global
	if baseType = "scene" then return m.top.getScene()
	if baseType = "focusedNode" then return RTA_getFocusedNode()
	if baseType = "elementId" then
		' Element ID will always be the first part of the key path
		keyPathParts = RTA_getStringAtKeyPath(args, "keyPath").split(".")

		matchingElementId = keyPathParts.shift()
		if matchingElementId = invalid then
			return RTA_buildErrorResponseObject("Base type of elementId but no keyPath provided")
		end if

		allNodes = m.top.getAll()
		for each node in allNodes
			elementId = node.getUIElementId()
			if elementId = matchingElementId then
				' We have to modify the returned key path to exclude the elementId part of the key path.
				args.keyPath = keyPathParts.join(".")
				return node
			end if
		end for

		return RTA_buildErrorResponseObject("Could not find elementId '" + matchingElementId + "'")
	end if
	return RTA_buildErrorResponseObject("Invalid base type supplied '" + baseType + "'")
end function

sub sendResponseToTask(request as Object, response as Object)
	if RTA_getBooleanAtKeyPath(request, "args.convertResponseToJsonCompatible", true) then
		try
			response = recursivelyConvertValueToJsonCompatible(response, RTA_getNumberAtKeyPath(request, "args.responseMaxChildDepth"))
		catch e
			response = RTA_buildErrorResponseObject("Error converting value to json compatible: " + e.message)
		end try
	end if

	response.id = request.id
	response["timeTaken"] = request.timespan.totalMilliseconds()
	request.timespan.mark() 'For the onFieldChangeRepeat, maybe needs an adjustment on future, for now it will only indicates the time between the same request id
	m.task.renderThreadResponse = response
end sub

function recursivelyConvertValueToJsonCompatible(value as Object, maxChildDepth as Integer, depth = -1 as Integer, recursiveObjects = [] as Object) as Object
	if RTA_isString(value) = false then
		recursionTest = formatJson(value, 512)
		' Empty string for a nonstring object means this is a recursive object that can't be fully converted to json
		if recursionTest = "" then
			' Check if we have access to IsSameObject
			utils = createObject("roUtils")
			if utils = invalid then
				' If we don't have access just throw an error
				return RTA_buildErrorResponseObject("Recursion detected")
			end if

			for each recursiveObject in recursiveObjects
				if utils.isSameObject(recursiveObject, value) then
					return "[[RECURSION]]"
				end if
			end for

			recursiveObjects.push(value)
		end if
	end if

	if RTA_isArray(value) then
		for i = 0 to RTA_getLastIndex(value)
			value[i] = recursivelyConvertValueToJsonCompatible(value[i], maxChildDepth, depth, recursiveObjects)
		end for
	else if RTA_isAA(value) then
		for each key in value
			value[key] = recursivelyConvertValueToJsonCompatible(value[key], maxChildDepth, depth, recursiveObjects)
		end for
	else if RTA_isNode(value) then
		depth++
		node = value
		if maxChildDepth < depth then
			value = {
				"id": node.id
			}
		else
			value = node.getFields()
			value.delete("focusedChild")
			value = recursivelyConvertValueToJsonCompatible(value, maxChildDepth, depth, recursiveObjects)
			if maxChildDepth > depth then
				children = []
				for each child in node.getChildren(-1, 0)
					children.push(recursivelyConvertValueToJsonCompatible(child, maxChildDepth, depth, recursiveObjects))
				end for
				value.children = children
			end if
		end if

		value.subtype = node.subtype()
		value.uiElementId = node.getUIElementId()
	end if

	return value
end function
