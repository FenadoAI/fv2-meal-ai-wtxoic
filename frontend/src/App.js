import { useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Trash2, Plus, ChefHat, Clock, Users, Target } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API = `${API_BASE}/api`;

const RecipeGenerator = () => {
  const [ingredients, setIngredients] = useState([]);
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [currentRestriction, setCurrentRestriction] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [mealType, setMealType] = useState("");
  const [cookingTime, setCookingTime] = useState("");
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addIngredient = () => {
    if (currentIngredient.trim() && !ingredients.includes(currentIngredient.trim())) {
      setIngredients([...ingredients, currentIngredient.trim()]);
      setCurrentIngredient("");
    }
  };

  const removeIngredient = (ingredient) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };

  const addDietaryRestriction = () => {
    if (currentRestriction.trim() && !dietaryRestrictions.includes(currentRestriction.trim())) {
      setDietaryRestrictions([...dietaryRestrictions, currentRestriction.trim()]);
      setCurrentRestriction("");
    }
  };

  const removeDietaryRestriction = (restriction) => {
    setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
  };

  const generateRecipe = async () => {
    if (ingredients.length === 0) {
      setError("Please add at least one ingredient");
      return;
    }

    setLoading(true);
    setError("");
    setRecipe(null);

    try {
      const response = await axios.post(`${API}/recipes/generate`, {
        ingredients,
        dietary_restrictions: dietaryRestrictions,
        cuisine_type: cuisineType || null,
        meal_type: mealType || null,
        cooking_time: cookingTime || null
      });

      if (response.data.success) {
        setRecipe(response.data.recipe);
      } else {
        setError(response.data.error || "Failed to generate recipe");
      }
    } catch (e) {
      console.error("Error generating recipe:", e);
      setError("Failed to connect to the recipe service. Please try again.");
    }

    setLoading(false);
  };

  const resetForm = () => {
    setIngredients([]);
    setCurrentIngredient("");
    setDietaryRestrictions([]);
    setCurrentRestriction("");
    setCuisineType("");
    setMealType("");
    setCookingTime("");
    setRecipe(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <h1 className="text-4xl font-bold text-gray-900">AI Recipe Generator</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Tell us what ingredients you have and we'll create a delicious recipe just for you!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Recipe Preferences</CardTitle>
              <CardDescription>
                Add your available ingredients and any preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ingredients */}
              <div className="space-y-3">
                <Label htmlFor="ingredients">Available Ingredients</Label>
                <div className="flex gap-2">
                  <Input
                    id="ingredients"
                    placeholder="Enter an ingredient (e.g., chicken, tomatoes, garlic)"
                    value={currentIngredient}
                    onChange={(e) => setCurrentIngredient(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                  />
                  <Button onClick={addIngredient} variant="secondary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {ingredients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ingredients.map((ingredient, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {ingredient}
                        <Trash2
                          className="h-3 w-3 cursor-pointer hover:text-red-500"
                          onClick={() => removeIngredient(ingredient)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-3">
                <Label htmlFor="restrictions">Dietary Restrictions (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="restrictions"
                    placeholder="Enter restriction (e.g., vegetarian, gluten-free)"
                    value={currentRestriction}
                    onChange={(e) => setCurrentRestriction(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addDietaryRestriction()}
                  />
                  <Button onClick={addDietaryRestriction} variant="secondary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {dietaryRestrictions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dietaryRestrictions.map((restriction, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        {restriction}
                        <Trash2
                          className="h-3 w-3 cursor-pointer hover:text-red-500"
                          onClick={() => removeDietaryRestriction(restriction)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Preferences */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cuisine">Cuisine Type (Optional)</Label>
                  <Select value={cuisineType} onValueChange={setCuisineType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cuisine type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="italian">Italian</SelectItem>
                      <SelectItem value="mexican">Mexican</SelectItem>
                      <SelectItem value="asian">Asian</SelectItem>
                      <SelectItem value="mediterranean">Mediterranean</SelectItem>
                      <SelectItem value="indian">Indian</SelectItem>
                      <SelectItem value="american">American</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meal">Meal Type (Optional)</Label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select meal type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Cooking Time (Optional)</Label>
                  <Select value={cookingTime} onValueChange={setCookingTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cooking time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15 minutes">Under 15 minutes</SelectItem>
                      <SelectItem value="30 minutes">Under 30 minutes</SelectItem>
                      <SelectItem value="1 hour">Under 1 hour</SelectItem>
                      <SelectItem value="2 hours">Under 2 hours</SelectItem>
                      <SelectItem value="no preference">No preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={generateRecipe}
                  disabled={loading || ingredients.length === 0}
                  className="flex-1"
                >
                  {loading ? "Generating..." : "Generate Recipe"}
                </Button>
                <Button onClick={resetForm} variant="outline">
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recipe Display */}
          {recipe && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  {recipe.name}
                </CardTitle>
                <CardDescription>{recipe.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recipe Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Prep</p>
                      <p className="text-gray-600">{recipe.prep_time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Cook</p>
                      <p className="text-gray-600">{recipe.cook_time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Serves</p>
                      <p className="text-gray-600">{recipe.servings}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Difficulty</p>
                      <p className="text-gray-600">{recipe.difficulty}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Ingredients */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Ingredients</h3>
                  <ul className="space-y-2">
                    {recipe.ingredients?.map((ingredient, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{ingredient.item}</span>
                        <span className="text-gray-600">
                          {ingredient.amount} {ingredient.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Instructions */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Instructions</h3>
                  <ol className="space-y-3">
                    {recipe.instructions?.map((instruction, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-sm font-medium">
                          {instruction.step}
                        </span>
                        <span className="text-gray-700">{instruction.instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Tips */}
                {recipe.tips && recipe.tips.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Tips</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {recipe.tips.map((tip, index) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Nutrition */}
                {recipe.nutrition && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Nutrition (per serving)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Calories</p>
                          <p className="text-gray-600">{recipe.nutrition.calories}</p>
                        </div>
                        <div>
                          <p className="font-medium">Protein</p>
                          <p className="text-gray-600">{recipe.nutrition.protein}</p>
                        </div>
                        <div>
                          <p className="font-medium">Carbs</p>
                          <p className="text-gray-600">{recipe.nutrition.carbs}</p>
                        </div>
                        <div>
                          <p className="font-medium">Fat</p>
                          <p className="text-gray-600">{recipe.nutrition.fat}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RecipeGenerator />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
