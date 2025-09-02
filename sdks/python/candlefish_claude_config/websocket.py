"""
WebSocket client for real-time configuration events.

Provides an asynchronous WebSocket client for receiving real-time
configuration updates from the Candlefish Claude Configuration System.
"""

import asyncio
import json
import logging
from typing import Optional, Callable, Dict, Any, AsyncIterator
from datetime import datetime
import websockets
from websockets.exceptions import WebSocketException, ConnectionClosedError

from .models import WebSocketEvent
from .exceptions import WebSocketError, AuthenticationError
from .auth import BaseAuth


logger = logging.getLogger(__name__)


class WebSocketClient:
    """
    WebSocket client for real-time configuration events.
    
    Connects to the Candlefish Claude Configuration System WebSocket
    endpoint to receive real-time updates about configuration changes.
    """
    
    def __init__(self, auth: BaseAuth, base_url: str = "wss://api.candlefish.ai/v2.0"):
        """
        Initialize WebSocket client.
        
        Args:
            auth: Authentication instance (APIKeyAuth or OAuth2Auth)
            base_url: Base WebSocket URL (should start with ws:// or wss://)
        """
        self.auth = auth
        self.base_url = base_url.rstrip('/')
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.is_connected = False
        self._event_handlers: Dict[str, Callable] = {}
        self._connection_lock = asyncio.Lock()
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_delay = 1.0
    
    async def connect(self) -> None:
        """
        Establish WebSocket connection.
        
        Raises:
            WebSocketError: If connection fails
            AuthenticationError: If authentication is invalid
        """
        async with self._connection_lock:
            if self.is_connected:
                return
            
            try:
                # Validate authentication
                if not self.auth.is_valid():
                    raise AuthenticationError("Authentication is not valid")
                
                # Build WebSocket URL
                ws_url = f"{self.base_url}/ws/config-events"
                
                # Get authentication headers
                auth_headers = self.auth.get_headers()
                
                # Convert headers to websocket format
                extra_headers = [
                    (k.replace('_', '-').lower(), v) 
                    for k, v in auth_headers.items()
                ]
                
                logger.info(f"Connecting to WebSocket: {ws_url}")
                
                # Establish connection
                self.websocket = await websockets.connect(
                    ws_url,
                    extra_headers=extra_headers,
                    ping_interval=30,
                    ping_timeout=10,
                    close_timeout=10
                )
                
                self.is_connected = True
                self._reconnect_attempts = 0
                
                logger.info("WebSocket connection established")
                
                # Start heartbeat task
                self._heartbeat_task = asyncio.create_task(self._heartbeat())
                
            except WebSocketException as e:
                raise WebSocketError(f"Failed to connect to WebSocket: {e}", e)
            except Exception as e:
                raise WebSocketError(f"Unexpected error during connection: {e}", e)
    
    async def disconnect(self) -> None:
        """
        Close WebSocket connection.
        """
        async with self._connection_lock:
            if not self.is_connected:
                return
            
            self.is_connected = False
            
            # Cancel heartbeat task
            if self._heartbeat_task:
                self._heartbeat_task.cancel()
                try:
                    await self._heartbeat_task
                except asyncio.CancelledError:
                    pass
                self._heartbeat_task = None
            
            # Close websocket
            if self.websocket:
                await self.websocket.close()
                self.websocket = None
            
            logger.info("WebSocket connection closed")
    
    async def send_message(self, message: Dict[str, Any]) -> None:
        """
        Send a message to the WebSocket server.
        
        Args:
            message: Message dictionary to send
            
        Raises:
            WebSocketError: If sending fails
        """
        if not self.is_connected or not self.websocket:
            raise WebSocketError("WebSocket not connected")
        
        try:
            message_json = json.dumps(message)
            await self.websocket.send(message_json)
            logger.debug(f"Sent WebSocket message: {message_json}")
            
        except WebSocketException as e:
            raise WebSocketError(f"Failed to send message: {e}", e)
    
    async def listen_for_events(self) -> AsyncIterator[WebSocketEvent]:
        """
        Listen for incoming WebSocket events.
        
        Yields:
            WebSocketEvent instances for each received event
            
        Raises:
            WebSocketError: If listening fails
        """
        if not self.is_connected or not self.websocket:
            raise WebSocketError("WebSocket not connected")
        
        try:
            async for message in self.websocket:
                try:
                    # Parse message
                    if isinstance(message, bytes):
                        message_str = message.decode('utf-8')
                    else:
                        message_str = message
                    
                    event_data = json.loads(message_str)
                    
                    # Add timestamp if not present
                    if 'timestamp' not in event_data:
                        event_data['timestamp'] = datetime.now().isoformat()
                    
                    # Create WebSocketEvent
                    event = WebSocketEvent(**event_data)
                    
                    logger.debug(f"Received WebSocket event: {event.event_type}")
                    
                    # Call registered handler
                    await self._handle_event(event)
                    
                    yield event
                    
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Failed to parse WebSocket message: {e}")
                    continue
                    
        except ConnectionClosedError:
            logger.warning("WebSocket connection closed by server")
            self.is_connected = False
            
            # Attempt reconnection
            if self._reconnect_attempts < self.max_reconnect_attempts:
                await self._attempt_reconnection()
            else:
                raise WebSocketError("Max reconnection attempts exceeded")
                
        except WebSocketException as e:
            raise WebSocketError(f"WebSocket error during listening: {e}", e)
    
    def on_event(self, event_type: str, handler: Callable[[WebSocketEvent], None]) -> None:
        """
        Register an event handler for a specific event type.
        
        Args:
            event_type: The event type to handle
            handler: Async function to call when event occurs
        """
        self._event_handlers[event_type] = handler
        logger.debug(f"Registered handler for event type: {event_type}")
    
    def remove_event_handler(self, event_type: str) -> None:
        """
        Remove an event handler for a specific event type.
        
        Args:
            event_type: The event type to remove handler for
        """
        if event_type in self._event_handlers:
            del self._event_handlers[event_type]
            logger.debug(f"Removed handler for event type: {event_type}")
    
    async def _handle_event(self, event: WebSocketEvent) -> None:
        """
        Handle incoming event by calling registered handlers.
        
        Args:
            event: The WebSocket event to handle
        """
        handler = self._event_handlers.get(event.event_type)
        if handler:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as e:
                logger.error(f"Error in event handler for {event.event_type}: {e}")
    
    async def _heartbeat(self) -> None:
        """
        Send periodic heartbeat messages to keep connection alive.
        """
        while self.is_connected:
            try:
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                
                if self.is_connected and self.websocket:
                    await self.websocket.ping()
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Heartbeat failed: {e}")
                break
    
    async def _attempt_reconnection(self) -> None:
        """
        Attempt to reconnect to WebSocket server.
        """
        self._reconnect_attempts += 1
        delay = self.reconnect_delay * (2 ** (self._reconnect_attempts - 1))  # Exponential backoff
        
        logger.info(f"Attempting reconnection {self._reconnect_attempts}/{self.max_reconnect_attempts} in {delay}s")
        
        await asyncio.sleep(delay)
        
        try:
            await self.connect()
        except Exception as e:
            logger.error(f"Reconnection attempt {self._reconnect_attempts} failed: {e}")
            
            if self._reconnect_attempts < self.max_reconnect_attempts:
                await self._attempt_reconnection()
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()


# Export WebSocket client
__all__ = ["WebSocketClient"]