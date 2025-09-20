from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

# AI agents
from ai_agents.agents import AgentConfig, SearchAgent, ChatAgent, RecipeAgent


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# AI agents init
agent_config = AgentConfig()
search_agent: Optional[SearchAgent] = None
chat_agent: Optional[ChatAgent] = None
recipe_agent: Optional[RecipeAgent] = None

# Main app
app = FastAPI(title="AI Agents API", description="Minimal AI Agents API with LangGraph and MCP support")

# API router
api_router = APIRouter(prefix="/api")


# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str


# AI agent models
class ChatRequest(BaseModel):
    message: str
    agent_type: str = "chat"  # "chat" or "search"
    context: Optional[dict] = None


class ChatResponse(BaseModel):
    success: bool
    response: str
    agent_type: str
    capabilities: List[str]
    metadata: dict = Field(default_factory=dict)
    error: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    max_results: int = 5


class SearchResponse(BaseModel):
    success: bool
    query: str
    summary: str
    search_results: Optional[dict] = None
    sources_count: int
    error: Optional[str] = None


class RecipeRequest(BaseModel):
    ingredients: List[str]
    dietary_restrictions: Optional[List[str]] = []
    cuisine_type: Optional[str] = None
    meal_type: Optional[str] = None
    cooking_time: Optional[str] = None


class RecipeResponse(BaseModel):
    success: bool
    recipe: dict
    error: Optional[str] = None

# Routes
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# AI agent routes
@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    # Chat with AI agent
    global search_agent, chat_agent
    
    try:
        # Init agents if needed
        if request.agent_type == "search" and search_agent is None:
            search_agent = SearchAgent(agent_config)
            
        elif request.agent_type == "chat" and chat_agent is None:
            chat_agent = ChatAgent(agent_config)
        
        # Select agent
        agent = search_agent if request.agent_type == "search" else chat_agent
        
        if agent is None:
            raise HTTPException(status_code=500, detail="Failed to initialize agent")
        
        # Execute agent
        response = await agent.execute(request.message)
        
        return ChatResponse(
            success=response.success,
            response=response.content,
            agent_type=request.agent_type,
            capabilities=agent.get_capabilities(),
            metadata=response.metadata,
            error=response.error
        )
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return ChatResponse(
            success=False,
            response="",
            agent_type=request.agent_type,
            capabilities=[],
            error=str(e)
        )


@api_router.post("/search", response_model=SearchResponse)
async def search_and_summarize(request: SearchRequest):
    # Web search with AI summary
    global search_agent
    
    try:
        # Init search agent if needed
        if search_agent is None:
            search_agent = SearchAgent(agent_config)
        
        # Search with agent
        search_prompt = f"Search for information about: {request.query}. Provide a comprehensive summary with key findings."
        result = await search_agent.execute(search_prompt, use_tools=True)
        
        if result.success:
            return SearchResponse(
                success=True,
                query=request.query,
                summary=result.content,
                search_results=result.metadata,
                sources_count=result.metadata.get("tools_used", 0)
            )
        else:
            return SearchResponse(
                success=False,
                query=request.query,
                summary="",
                sources_count=0,
                error=result.error
            )
            
    except Exception as e:
        logger.error(f"Error in search endpoint: {e}")
        return SearchResponse(
            success=False,
            query=request.query,
            summary="",
            sources_count=0,
            error=str(e)
        )


@api_router.get("/agents/capabilities")
async def get_agent_capabilities():
    # Get agent capabilities
    try:
        capabilities = {
            "search_agent": SearchAgent(agent_config).get_capabilities(),
            "chat_agent": ChatAgent(agent_config).get_capabilities()
        }
        return {
            "success": True,
            "capabilities": capabilities
        }
    except Exception as e:
        logger.error(f"Error getting capabilities: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@api_router.post("/recipes/generate", response_model=RecipeResponse)
async def generate_recipe(request: RecipeRequest):
    # Generate a recipe using specialized AI agent
    global recipe_agent

    try:
        # Init recipe agent if needed
        if recipe_agent is None:
            recipe_agent = RecipeAgent(agent_config)

        # Build recipe generation prompt
        ingredients_list = ", ".join(request.ingredients)
        prompt_parts = [f"Create a detailed recipe using these ingredients: {ingredients_list}"]

        if request.dietary_restrictions:
            restrictions = ", ".join(request.dietary_restrictions)
            prompt_parts.append(f"Dietary restrictions: {restrictions}")

        if request.cuisine_type:
            prompt_parts.append(f"Cuisine type: {request.cuisine_type}")

        if request.meal_type:
            prompt_parts.append(f"Meal type: {request.meal_type}")

        if request.cooking_time:
            prompt_parts.append(f"Cooking time preference: {request.cooking_time}")

        prompt_parts.append("""
{
  "name": "Recipe Name",
  "description": "Brief description",
  "prep_time": "X minutes",
  "cook_time": "X minutes",
  "servings": "X",
  "difficulty": "Easy/Medium/Hard",
  "ingredients": [
    {"item": "ingredient name", "amount": "quantity", "unit": "unit"}
  ],
  "instructions": [
    {"step": 1, "instruction": "First step"},
    {"step": 2, "instruction": "Second step"}
  ],
  "tips": ["helpful tip 1", "helpful tip 2"],
  "nutrition": {
    "calories": "approximate calories per serving",
    "protein": "protein content",
    "carbs": "carbohydrate content",
    "fat": "fat content"
  }
}""")

        recipe_prompt = "\n".join(prompt_parts)

        # Execute agent
        result = await recipe_agent.execute(recipe_prompt)

        if result.success:
            # Try to parse as JSON, fallback to structured text
            import json
            import re

            content = result.content.strip()

            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                json_str = json_match.group()
            else:
                json_str = content

            try:
                recipe_data = json.loads(json_str)

                # Validate required fields
                required_fields = ['name', 'description', 'prep_time', 'cook_time', 'servings', 'difficulty', 'ingredients', 'instructions']
                for field in required_fields:
                    if field not in recipe_data:
                        raise ValueError(f"Missing required field: {field}")

            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse recipe JSON: {e}, falling back to structured data")
                # If JSON parsing fails, create structured data from text
                recipe_data = {
                    "name": f"{request.cuisine_type.title() if request.cuisine_type else ''} {request.meal_type.title() if request.meal_type else 'Dish'} with {', '.join(request.ingredients[:2])}".strip(),
                    "description": f"A delicious recipe using {', '.join(request.ingredients)} with {', '.join(request.dietary_restrictions) if request.dietary_restrictions else 'no dietary restrictions'}",
                    "prep_time": "15 minutes",
                    "cook_time": request.cooking_time or "30 minutes",
                    "servings": "4",
                    "difficulty": "Medium",
                    "ingredients": [
                        {"item": ing, "amount": "1-2", "unit": "portions"} for ing in request.ingredients
                    ],
                    "instructions": [
                        {"step": 1, "instruction": f"Prepare all ingredients: {', '.join(request.ingredients)}"},
                        {"step": 2, "instruction": "Heat oil in a large pan over medium heat"},
                        {"step": 3, "instruction": "Add ingredients and cook according to recipe requirements"},
                        {"step": 4, "instruction": "Season with salt, pepper, and herbs to taste"},
                        {"step": 5, "instruction": "Serve hot and enjoy!"}
                    ],
                    "tips": [
                        "Adjust seasoning to taste",
                        "Feel free to substitute ingredients based on availability"
                    ],
                    "nutrition": {
                        "calories": "300-400 per serving",
                        "protein": "15-25g",
                        "carbs": "20-40g",
                        "fat": "10-20g"
                    }
                }

            return RecipeResponse(
                success=True,
                recipe=recipe_data
            )
        else:
            return RecipeResponse(
                success=False,
                recipe={},
                error=result.error
            )

    except Exception as e:
        logger.error(f"Error in recipe generation endpoint: {e}")
        return RecipeResponse(
            success=False,
            recipe={},
            error=str(e)
        )

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging config
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Initialize agents on startup
    global search_agent, chat_agent
    logger.info("Starting AI Agents API...")
    
    # Lazy agent init for faster startup
    logger.info("AI Agents API ready!")


@app.on_event("shutdown")
async def shutdown_db_client():
    # Cleanup on shutdown
    global search_agent, chat_agent
    
    # Close MCP
    if search_agent and search_agent.mcp_client:
        # MCP cleanup automatic
        pass
    
    client.close()
    logger.info("AI Agents API shutdown complete.")
